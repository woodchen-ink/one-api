package model

import (
	"context"
	"czloapi/common/requester"
	"czloapi/common/utils"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"gorm.io/gorm"
)

const proxyLatencyTestURL = "https://www.gstatic.com/generate_204"

// IPProxy 表示可被渠道复用的代理配置。
type IPProxy struct {
	Id          int            `json:"id"`
	Name        string         `json:"name" form:"name" gorm:"type:varchar(64);index;not null"`
	Proxy       string         `json:"proxy" form:"proxy" gorm:"column:proxy;type:varchar(512);not null"`
	Remark      *string        `json:"remark" form:"remark" gorm:"type:varchar(255);default:''"`
	Latency     *int           `json:"latency" form:"latency"`
	TestTime    int64          `json:"test_time" gorm:"bigint;default:0"`
	TestStatus  bool           `json:"test_status" gorm:"default:false"`
	TestMessage *string        `json:"test_message" gorm:"type:varchar(255);default:''"`
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UpdatedTime int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// NormalizeChannelProxyPoolID 将无效的代理池 ID 统一归一为 nil。
func NormalizeChannelProxyPoolID(proxyPoolID *int) *int {
	if proxyPoolID == nil || *proxyPoolID <= 0 {
		return nil
	}
	return proxyPoolID
}

// EnsureIPProxyExists 校验渠道绑定的代理池是否存在。
func EnsureIPProxyExists(proxyPoolID *int) error {
	proxyPoolID = NormalizeChannelProxyPoolID(proxyPoolID)
	if proxyPoolID == nil {
		return nil
	}

	var count int64
	err := DB.Model(&IPProxy{}).Where("id = ?", *proxyPoolID).Count(&count).Error
	if err != nil {
		return err
	}
	if count == 0 {
		return errors.New("所选IP代理池不存在")
	}
	return nil
}

// ResolveChannelProxy 优先使用渠道直填代理，其次回退到代理池中的代理地址。
func ResolveChannelProxy(proxyValue string, proxyPoolID *int, loadedProxyPool *IPProxy) (string, error) {
	proxyValue = strings.TrimSpace(proxyValue)
	if proxyValue != "" {
		return proxyValue, nil
	}

	proxyPoolID = NormalizeChannelProxyPoolID(proxyPoolID)
	if proxyPoolID == nil {
		return "", nil
	}

	if loadedProxyPool != nil && loadedProxyPool.Id == *proxyPoolID {
		return strings.TrimSpace(loadedProxyPool.Proxy), nil
	}

	proxyPool, err := GetIPProxyById(*proxyPoolID)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(proxyPool.Proxy), nil
}

// ValidateProxyAddress 校验代理地址格式，只允许常见的 HTTP/SOCKS5 协议。
func ValidateProxyAddress(proxyAddr string) (string, error) {
	proxyAddr = strings.TrimSpace(proxyAddr)
	if proxyAddr == "" {
		return "", errors.New("代理地址不能为空")
	}

	parsed, err := url.Parse(proxyAddr)
	if err != nil {
		return "", fmt.Errorf("代理地址格式错误: %w", err)
	}

	scheme := strings.ToLower(parsed.Scheme)
	switch scheme {
	case "http", "https", "socks5", "socks5h":
	default:
		return "", fmt.Errorf("暂不支持的代理协议: %s", parsed.Scheme)
	}

	if parsed.Host == "" {
		return "", errors.New("代理地址缺少主机和端口")
	}

	return proxyAddr, nil
}

// Prepare 会在入库前做字段清洗和校验。
func (p *IPProxy) Prepare() error {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		return errors.New("代理名称不能为空")
	}

	proxyAddr, err := ValidateProxyAddress(p.Proxy)
	if err != nil {
		return err
	}
	p.Proxy = proxyAddr

	if p.Remark != nil {
		remark := strings.TrimSpace(*p.Remark)
		p.Remark = &remark
	}

	return nil
}

// Insert 新增代理池记录。
func (p *IPProxy) Insert() error {
	if err := p.Prepare(); err != nil {
		return err
	}

	now := utils.GetTimestamp()
	p.CreatedTime = now
	p.UpdatedTime = now
	return DB.Create(p).Error
}

// Update 更新代理池记录。
func (p *IPProxy) Update() error {
	if err := p.Prepare(); err != nil {
		return err
	}

	current, err := GetIPProxyById(p.Id)
	if err != nil {
		return err
	}

	current.Name = p.Name
	current.Proxy = p.Proxy
	current.Remark = p.Remark
	current.UpdatedTime = utils.GetTimestamp()

	return DB.Model(current).Select("name", "proxy", "remark", "updated_time").Updates(current).Error
}

// Delete 删除代理池前先确认没有渠道仍在引用它。
func (p *IPProxy) Delete() error {
	var count int64
	err := DB.Model(&Channel{}).Where("proxy_pool_id = ?", p.Id).Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("还有 %d 个渠道正在使用该IP代理池，无法删除", count)
	}

	return DB.Delete(p).Error
}

// UpdateTestResult 持久化最近一次测试的状态与延迟。
func (p *IPProxy) UpdateTestResult(latency *int, success bool, message string) error {
	message = truncateProxyTestMessage(message)
	now := utils.GetTimestamp()
	p.Latency = latency
	p.TestStatus = success
	p.TestTime = now
	p.UpdatedTime = now
	p.TestMessage = &message

	return DB.Model(p).Select("latency", "test_status", "test_time", "updated_time", "test_message").Updates(p).Error
}

// TestLatency 使用代理访问固定探活地址，记录可观测的最近延迟。
func (p *IPProxy) TestLatency() (int, error) {
	latency, err := testProxyLatency(p.Proxy)
	if err != nil {
		_ = p.UpdateTestResult(nil, false, err.Error())
		return 0, err
	}

	_ = p.UpdateTestResult(&latency, true, "测试成功")
	return latency, nil
}

// GetIPProxyList 获取全部代理池配置，供后台列表与渠道弹窗复用。
func GetIPProxyList() ([]*IPProxy, error) {
	var proxies []*IPProxy
	err := DB.Order("id DESC").Find(&proxies).Error
	return proxies, err
}

// GetIPProxyById 获取单个代理池详情。
func GetIPProxyById(id int) (*IPProxy, error) {
	proxy := IPProxy{Id: id}
	err := DB.First(&proxy, "id = ?", id).Error
	return &proxy, err
}

func truncateProxyTestMessage(message string) string {
	message = strings.TrimSpace(message)
	if message == "" {
		return ""
	}

	runes := []rune(message)
	if len(runes) <= 255 {
		return message
	}
	return string(runes[:255])
}

func testProxyLatency(proxyAddr string) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	requesterClient := requester.NewHTTPRequester(proxyAddr, nil)
	requesterClient.Context = ctx
	requesterClient.IsOpenAI = false

	req, err := requesterClient.NewRequest(http.MethodGet, proxyLatencyTestURL)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "czloapi-proxy-check/1.0")

	startedAt := time.Now()
	resp, openAIErr := requesterClient.SendRequestRaw(req)
	if openAIErr != nil {
		return 0, errors.New(openAIErr.Message)
	}
	defer resp.Body.Close()

	_, _ = io.Copy(io.Discard, resp.Body)
	return int(time.Since(startedAt).Milliseconds()), nil
}
