# CZLConnect OAuth2 登录集成配置指南

## 📋 管理员配置步骤

### 1. 在CZLConnect创建OAuth应用

1. 访问 [CZLConnect管理后台](https://connect.czl.net)
2. 创建新的OAuth应用
3. 获取以下信息：
   - `Client ID`
   - `Client Secret`
   - 设置回调地址为：`https://yourdomain.com/oauth/czlconnect`

### 2. 在One-API后台配置

1. 登录One-API管理后台
2. 进入 **设置 → 系统设置**
3. 在 **配置登录和注册** 部分：
   - 勾选 ✅ **允许通过 CZLConnect 账户登录 & 注册**

4. 在 **配置 CZLConnect OAuth 应用** 部分填写：
   - **CZLConnect Client ID**: 从CZLConnect获取的Client ID
   - **CZLConnect Client Secret**: 从CZLConnect获取的Client Secret  
   - **重定向 URI**: `https://yourdomain.com/oauth/czlconnect`

5. 点击 **保存 CZLConnect OAuth 设置**

### 3. 配置参数说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `CZLConnectAuthEnabled` | 启用/禁用CZLConnect登录 | `true` |
| `CZLConnectClientId` | OAuth应用的Client ID | `your_client_id` |
| `CZLConnectClientSecret` | OAuth应用的Client Secret | `your_client_secret` |
| `CZLConnectRedirectUri` | OAuth回调地址 | `https://yourdomain.com/oauth/czlconnect` |

## 🔄 OAuth2 流程说明

### 用户登录流程
1. 用户点击 **使用 CZLConnect 登录**
2. 跳转到CZLConnect授权页面
3. 用户确认授权
4. CZLConnect重定向回应用并带上授权码
5. 应用交换授权码获取访问令牌
6. 使用访问令牌获取用户信息
7. 自动注册或登录用户

### 账号绑定流程
1. 已登录用户访问绑定页面
2. 跳转到CZLConnect授权页面
3. 用户确认授权
4. 系统将CZLConnect账号与当前用户绑定
5. 绑定成功后可使用CZLConnect登录

## 🛠️ 技术实现特性

- ✅ **标准OAuth2协议**: 遵循OAuth2.0授权码流程
- ✅ **安全验证**: 包含state参数防止CSRF攻击
- ✅ **信息同步**: 自动同步用户名、昵称、邮箱、头像
- ✅ **邮箱验证**: 支持主邮箱验证和获取
- ✅ **防重复绑定**: 一个CZLConnect账号只能绑定一个系统账号
- ✅ **邀请码支持**: 支持通过邀请码注册新用户
- ✅ **多语言**: 支持中英文界面
- ✅ **错误处理**: 完善的错误处理和重试机制

## 🌐 API端点

### CZLConnect OAuth2 端点
- **授权端点**: `https://connect.czl.net/oauth2/authorize`
- **令牌端点**: `https://connect.czl.net/api/oauth2/token`
- **用户信息端点**: `https://connect.czl.net/api/oauth2/userinfo`
- **用户邮箱端点**: `https://connect.czl.net/api/oauth2/user/emails`

### One-API端点
- **登录**: `GET /api/oauth/czlconnect`
- **绑定**: `GET /api/oauth/czlconnect/bind`
- **OAuth状态**: `GET /api/oauth/state`

## 🚨 注意事项

1. **安全配置**:
   - 确保 `CZLConnectClientSecret` 妥善保管
   - 重定向URI必须与CZLConnect后台配置一致

2. **域名配置**:
   - 确保 `ServerAddress` 配置正确
   - 重定向URI使用HTTPS协议

3. **用户体验**:
   - 首次使用需要在CZLConnect确认授权
   - 支持自动注册，无需手动创建账号

## 🔧 故障排除

### 常见问题

**问题**: 点击登录没有反应
- **解决**: 检查 `CZLConnectAuthEnabled` 是否为 `true`

**问题**: 授权后报错 "state is empty or not same"
- **解决**: 检查session配置和OAuth状态参数

**问题**: 提示 "该 CZLConnect 账户已被绑定"
- **解决**: 该CZLConnect账号已被其他用户绑定，请使用其他账号

**问题**: 获取用户信息失败
- **解决**: 检查Client ID和Client Secret是否正确配置

---

🎉 **集成完成！** 用户现在可以通过CZLConnect账号快速登录和注册了！