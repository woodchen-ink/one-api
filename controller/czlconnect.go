package controller

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"one-api/common/config"
	"one-api/common/logger"
	"one-api/model"
	"strconv"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type CZLConnectOAuthResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

type CZLConnectUser struct {
	Id       int    `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

type CZLConnectEmail struct {
	Email      string `json:"email"`
	Verified   bool   `json:"verified"`
	Primary    bool   `json:"primary"`
	Visibility string `json:"visibility"`
}

func getCZLConnectUserInfoByCode(code string) (*CZLConnectUser, error) {
	if code == "" {
		return nil, errors.New("无效的参数")
	}

	// Exchange authorization code for access token
	values := url.Values{}
	values.Set("grant_type", "authorization_code")
	values.Set("code", code)
	values.Set("client_id", config.CZLConnectClientId)
	values.Set("client_secret", config.CZLConnectClientSecret)
	values.Set("redirect_uri", config.CZLConnectRedirectUri)

	req, err := http.NewRequest("POST", "https://connect.czl.net/api/oauth2/token", bytes.NewBufferString(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := http.Client{
		Timeout: 10 * time.Second,
	}

	res, err := client.Do(req)
	if err != nil {
		logger.SysError("无法连接至 CZLConnect 服务器, err:" + err.Error())
		return nil, errors.New("无法连接至 CZLConnect 服务器，请稍后重试！")
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		logger.SysError(fmt.Sprintf("CZLConnect token exchange failed with status: %d", res.StatusCode))
		return nil, errors.New("无法连接至 CZLConnect 服务器，请稍后重试！")
	}

	var oAuthResponse CZLConnectOAuthResponse
	err = json.NewDecoder(res.Body).Decode(&oAuthResponse)
	if err != nil {
		return nil, err
	}

	if oAuthResponse.AccessToken == "" {
		return nil, errors.New("获取访问令牌失败")
	}

	// Get user info using access token
	req, err = http.NewRequest("GET", "https://connect.czl.net/api/oauth2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", oAuthResponse.AccessToken))

	res2, err := client.Do(req)
	if err != nil {
		logger.SysError("无法连接至 CZLConnect 服务器, err:" + err.Error())
		return nil, errors.New("无法连接至 CZLConnect 服务器，请稍后重试！")
	}
	defer res2.Body.Close()

	if res2.StatusCode != http.StatusOK {
		logger.SysError(fmt.Sprintf("CZLConnect userinfo failed with status: %d", res2.StatusCode))
		return nil, errors.New("无法连接至 CZLConnect 服务器，请稍后重试！")
	}

	var czlUser CZLConnectUser
	err = json.NewDecoder(res2.Body).Decode(&czlUser)
	if err != nil {
		return nil, err
	}

	if czlUser.Username == "" {
		return nil, errors.New("返回值非法，用户字段为空，请稍后重试！")
	}

	// If email is empty, try to get it from emails endpoint (similar to GitHub)
	if czlUser.Email == "" {
		req, err = http.NewRequest("GET", "https://connect.czl.net/api/oauth2/user/emails", nil)
		if err == nil {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", oAuthResponse.AccessToken))
			res3, err := client.Do(req)
			if err == nil {
				defer res3.Body.Close()
				if res3.StatusCode == http.StatusOK {
					var czlEmails []*CZLConnectEmail
					err = json.NewDecoder(res3.Body).Decode(&czlEmails)
					if err == nil {
						czlUser.Email = getCZLConnectPrimaryEmail(czlEmails)
					}
				}
			}
		}
	}

	return &czlUser, nil
}

func getCZLConnectPrimaryEmail(czlEmails []*CZLConnectEmail) string {
	for _, email := range czlEmails {
		if email.Primary && email.Verified {
			return email.Email
		}
	}
	return ""
}

func getUserByCZLConnect(czlUser *CZLConnectUser) (user *model.User, err error) {
	// Check if CZLConnect ID already exists
	if model.IsCZLConnectIdAlreadyTaken(czlUser.Id) {
		user, err = model.FindUserByField("czlconnect_id", czlUser.Id)
		if err != nil {
			return nil, err
		}
	}

	// If user not found by CZLConnect ID, check by email
	if user == nil && czlUser.Email != "" && model.IsEmailAlreadyTaken(czlUser.Email) {
		user, err = model.FindUserByField("email", czlUser.Email)
		if err != nil {
			return nil, err
		}
	}

	return user, nil
}

func CZLConnectOAuth(c *gin.Context) {
	session := sessions.Default(c)
	state := c.Query("state")
	if state == "" || session.Get("oauth_state") == nil || state != session.Get("oauth_state").(string) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "state is empty or not same",
		})
		return
	}

	username := session.Get("username")
	if username != nil {
		CZLConnectBind(c)
		return
	}

	if !config.CZLConnectAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "管理员未开启通过 CZLConnect 登录以及注册",
		})
		return
	}

	code := c.Query("code")
	affCode := c.Query("aff")

	czlUser, err := getCZLConnectUserInfoByCode(code)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	user, err := getUserByCZLConnect(czlUser)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// If user doesn't exist, create new user
	if user == nil {
		if !config.RegisterEnabled {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员关闭了新用户注册",
			})
			return
		}

		user = &model.User{
			CZLConnectId: czlUser.Id,
			Email:        czlUser.Email,
			Role:         config.RoleCommonUser,
			Status:       config.UserStatusEnabled,
			AvatarUrl:    czlUser.Avatar,
		}

		// Handle invitation code
		var inviterId int
		if affCode != "" {
			inviterId, _ = model.GetUserIdByAffCode(affCode)
		}

		if inviterId > 0 {
			user.InviterId = inviterId
		}

		user.Username = czlUser.Username
		if model.IsUsernameAlreadyTaken(user.Username) {
			user.Username = "czl_" + strconv.Itoa(model.GetMaxUserId()+1)
		}

		if czlUser.Nickname != "" {
			user.DisplayName = czlUser.Nickname
		} else {
			user.DisplayName = user.Username
		}

		if err := user.Insert(inviterId); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

	} else {
		// If user exists, update user info
		user.CZLConnectId = czlUser.Id

		// Update email if user's email is empty and CZLConnect email is not taken
		if user.Email == "" && czlUser.Email != "" && !model.IsEmailAlreadyTaken(czlUser.Email) {
			user.Email = czlUser.Email
		}

		// Update avatar if user's avatar is empty
		if user.AvatarUrl == "" && czlUser.Avatar != "" {
			user.AvatarUrl = czlUser.Avatar
		}

		// Update display name if available
		if czlUser.Nickname != "" {
			user.DisplayName = czlUser.Nickname
		}
	}

	if user.Status != config.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "用户已被封禁",
			"success": false,
		})
		return
	}

	setupLogin(user, c)
}

func CZLConnectBind(c *gin.Context) {
	if !config.CZLConnectAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "管理员未开启通过 CZLConnect 登录以及注册",
		})
		return
	}

	code := c.Query("code")
	czlUser, err := getCZLConnectUserInfoByCode(code)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if model.IsCZLConnectIdAlreadyTaken(czlUser.Id) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该 CZLConnect 账户已被绑定",
		})
		return
	}

	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{
		Id: id.(int),
	}

	err = user.FillUserById()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	user.CZLConnectId = czlUser.Id

	if user.AvatarUrl == "" && czlUser.Avatar != "" {
		user.AvatarUrl = czlUser.Avatar
	}

	if user.Email == "" && czlUser.Email != "" && !model.IsEmailAlreadyTaken(czlUser.Email) {
		user.Email = czlUser.Email
	}

	if czlUser.Nickname != "" {
		user.DisplayName = czlUser.Nickname
	}

	err = user.Update(false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "bind",
	})
}