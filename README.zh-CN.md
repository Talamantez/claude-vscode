# Claude AI 助手 VSCode 插件

> **翻译说明**: 本文档为社区维护的中文翻译版本。为确保文档质量，我们诚邀您参与改进：
> 1. 通过 GitHub Issue 反馈问题
> 2. 在 GitHub Discussions 提出建议
> 3. 直接提交 Pull Request 帮助改进
>
> 感谢您对提升中文技术文档质量的贡献！

---

在 VSCode 中直接体验 Claude 的智能辅助功能。本插件让您能够在开发过程中无缝对话 Claude AI，提升代码编写、注释生成和代码理解的效率。

## 核心功能

* 智能对话：选中任意代码或文本，右键即可向 Claude 提问
* 注释生成：一键生成规范的代码注释和文档
* 上下文理解：支持多轮对话，保持对话连贯性
* Markdown 渲染：回复内容结构清晰，易于阅读理解

## 使用入门

1. 安装插件
2. 配置 Claude API 密钥（详见下文）
3. 选中文本，点击右键菜单，选择 Claude AI 后可以：
   * 选择`询问 Claude`获取智能解答
   * 选择`生成代码注释`自动创建文档

操作简单，即刻上手！

## API 密钥设置

### 获取密钥
1. 注册 Anthropic 开发者账号
2. 访问 API 管理页面
3. 创建新的 API 密钥
4. 请妥善保管密钥，切勿泄露或上传

### 配置密钥

方式一 - VS Code 设置（推荐）：
1. 打开设置面板（Ctrl/Cmd + ,）
2. 搜索 "Claude VS Code"
3. 填入您的 API 密钥
4. VS Code 将安全加密存储密钥

方式二 - 环境变量：
* 在系统环境变量中设置 CLAUDE_API_KEY
* 确保使用安全的环境变量管理方式

## 中国大陆地区配置

### 区域设置
1. 在 VS Code 设置中选择"CN"区域
2. 系统将自动切换至中国区域优化服务器

### 代理配置（可选）
在 VS Code 设置中添加：
```json
{
    "claude-vscode.proxySettings": {
        "host": "代理服务器地址",
        "port": 端口号,
        "auth": {
            "username": "用户名",
            "password": "密码"
        }
    }
}
```

## 安全保障

* API 密钥经 VS Code 安全加密存储
* 采用 HTTPS 加密通信
* 不存储任何对话数据
* 直连 Claude API，无中间服务器
* 用户完全控制密钥权限

## 模型选择

通过 VS Code 设置选择模型：
* claude-3-opus-20240229（默认）
* claude-3-sonnet-20240229

## 系统要求

* VS Code 1.80.0 或更高版本
* 稳定的网络连接
* Claude API 密钥

## 问题反馈

遇到问题或有功能建议？欢迎在我们的 [GitHub 仓库](https://github.com/talamantez/claude-vscode) 提交 Issue！

## 参与翻译

优质的中文文档对用户体验至关重要。如果您发现：
- 翻译不够准确或自然
- 技术术语使用不当
- 更优的表达方式
- 其他需要改进之处

欢迎通过以下方式参与改进：
1. 提交 [GitHub Issue](https://github.com/talamantez/claude-vscode/issues/new)，标记为"translation"
2. 直接提交 [Pull Request](https://github.com/talamantez/claude-vscode)
3. 在 Discussions 中分享建议

您的每一条建议都将帮助我们为中文开发者提供更好的使用体验！

---

由 [Conscious Robot](https://conscious-robot.com) 开发

_注：本插件已针对中国大陆地区优化，包括本地化服务器和完整的代理支持。_