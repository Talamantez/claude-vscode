# Claude AI 助手 VSCode 扩展

> **翻译说明**: 本文档是由机器翻译生成的初版中文翻译。作为开源项目，我们非常欢迎社区帮助改进翻译质量！如果您发现任何翻译不准确或需要改进的地方，请随时:
> 1. 在 GitHub 上提交 Issue 或 Pull Request
> 2. 通过 GitHub Discussions 分享您的建议
> 3. 直接联系作者改进翻译
>
> 您的反馈对帮助改善中文用户体验非常重要！

---

将 Claude 的强大功能直接引入您的开发工作流程。这个扩展让您无需离开 VSCode 就能与 Claude AI 交互，帮助您更高效地编写、记录和理解代码。

## 主要特点

* 询问 Claude：选择任何文本，右键点击即可获得 AI 即时帮助
* 代码文档：自动为您的代码生成文档
* 上下文感知：可以包含之前回答的内容作为上下文
* Markdown 输出：响应格式清晰易读

## 快速开始

1. 安装扩展
2. 设置您的 Claude API 密钥（见下文）
3. 选择文本，右键点击，选择 Claude AI，然后选择：
   * `询问 Claude` 获取常规帮助
   * `生成代码文档` 进行自动文档生成

就是这么简单！

## API 密钥设置

### 获取密钥
1. 注册 Anthropic 账户
2. 进入 API 设置
3. 生成新的 API 密钥
4. 确保安全 - 切勿分享或提交密钥

### 添加密钥

方法 1 - VS Code 设置（推荐）：
1. 打开设置（Ctrl/Cmd + ,）
2. 搜索 "Claude VS Code"
3. 输入您的 API 密钥
4. VS Code 会安全存储密钥

方法 2 - 环境变量：
* 在环境中设置 CLAUDE_API_KEY
* 确保安全的变量管理

## 中国地区特定配置

### 区域设置
1. 在 VS Code 设置中选择 "CN" 区域
2. 系统将自动使用中国区域优化的端点

### 代理设置（如需要）
在 VS Code 设置中配置：
```json
{
    "claude-vscode.proxySettings": {
        "host": "您的代理服务器",
        "port": 端口号,
        "auth": {
            "username": "用户名",
            "password": "密码"
        }
    }
}
```

## 安全第一

* 密钥存储在 VS Code 的安全存储中
* 仅 HTTPS API 通信
* 不存储或记录数据
* 直接的 Claude API 集成
* 您完全掌控您的密钥

## 模型选择

在 VS Code 设置中选择您的模型：
* claude-3-opus-20240229（默认）
* claude-3-sonnet-20240229

## 系统要求

* VS Code 1.80.0+
* 互联网连接
* Claude API 密钥

## 问题反馈

遇到问题或有新功能建议？欢迎在我们的 [GitHub 仓库](https://github.com/talamantez/claude-vscode) 提出问题！

## 帮助改进翻译

这个中文文档的质量对我们来说非常重要！如果您发现：
- 翻译不准确或不自然的地方
- 技术术语使用不当
- 更好的表达方式
- 任何其他可以改进的地方

请通过以下方式帮助我们改进：
1. 在 [GitHub Issues](https://github.com/talamantez/claude-vscode/issues/new) 上提交问题，标签使用 "translation"
2. 直接在 [GitHub](https://github.com/talamantez/claude-vscode) 上提交 Pull Request
3. 在 Discussions 中分享您的想法

每一个建议都会帮助我们为中文开发者提供更好的体验！感谢您的参与！

---

由 [Conscious Robot](https://conscious-robot.com) 开发

_注：此扩展已针对中国地区进行优化，包括本地化的 API 端点和完整的代理支持。_