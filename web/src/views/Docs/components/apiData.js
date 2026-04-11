export const SIDEBAR_WIDTH = 260;

export const apiSections = [
  // ========== OpenAI Compatible ==========
  {
    id: 'api-responses',
    title: 'Responses',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/responses',
    description:
      'OpenAI Responses API，新一代对话接口。支持缓存, 内置工具（联网搜索、代码执行、文件搜索）、多模态输入、思考模式（reasoning）等高级功能。',
    detail:
      '相比 Chat Completions，Responses API 原生支持 reasoning（思考/推理模式），模型可以在回答之前进行深度思考，适合复杂问题。同时内置了 web_search、code_interpreter 等工具，无需手动实现函数调用。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '模型名称，推荐使用 o1、o3、o4-mini 等支持推理的模型' },
      { name: 'input', type: 'string | array', required: true, desc: '输入内容，可以是字符串或消息数组' },
      { name: 'stream', type: 'boolean', required: false, desc: '是否流式输出' },
      { name: 'reasoning', type: 'object', required: false, desc: '思考模式配置，如 { "effort": "high" }' },
      { name: 'tools', type: 'array', required: false, desc: '内置工具列表，如 web_search_preview、code_interpreter' },
      { name: 'temperature', type: 'number', required: false, desc: '采样温度' },
      { name: 'max_output_tokens', type: 'integer', required: false, desc: '最大输出 token 数' }
    ],
    requestExample: {
      model: 'o4-mini',
      input: '分析量子计算在密码学领域的影响和未来发展趋势',
      reasoning: { effort: 'high' },
      stream: false
    },
    responseExample: {
      id: 'resp_xxx',
      object: 'response',
      output: [
        {
          type: 'reasoning',
          id: 'rs_xxx',
          summary: [{ type: 'summary_text', text: '分析了量子计算对 RSA、ECC 等算法的威胁...' }]
        },
        {
          type: 'message',
          id: 'msg_xxx',
          role: 'assistant',
          content: [{ type: 'output_text', text: '量子计算对密码学的影响主要体现在以下几个方面...' }]
        }
      ],
      usage: { input_tokens: 15, output_tokens: 280, total_tokens: 295 }
    }
  },
  {
    id: 'api-responses-resource',
    title: 'Responses 资源接口',
    group: 'OpenAI Compatible',
    method: 'GET',
    endpoint: '/v1/responses/{response_id}',
    endpoints: [
      { method: 'GET', endpoint: '/v1/responses/{response_id}' },
      { method: 'DELETE', endpoint: '/v1/responses/{response_id}' },
      { method: 'POST', endpoint: '/v1/responses/{response_id}/cancel' },
      { method: 'GET', endpoint: '/v1/responses/{response_id}/input_items' }
    ],
    description: 'Responses 资源管理接口。用于读取、删除、取消已创建的 response，以及查看该 response 的 input items。',
    detail:
      '适用于 agent 工作流、远程压缩、异步任务管理等场景。通常先通过 POST /v1/responses 创建 response，再使用这些资源接口进行后续查询或控制。',
    headers: {
      Authorization: 'Bearer sk-your-api-key'
    },
    note: '这些接口依赖 response_id。建议 response 先通过当前网关创建，再使用后续资源接口访问。',
    parameters: [{ name: 'response_id', type: 'string (path)', required: true, desc: 'response 资源 ID，如 resp_123' }],
    requestExample: {
      retrieve: 'GET /v1/responses/resp_123',
      cancel: 'POST /v1/responses/resp_123/cancel',
      input_items: 'GET /v1/responses/resp_123/input_items'
    },
    responseExample: {
      id: 'resp_123',
      object: 'response',
      status: 'completed',
      conversation_id: 'conv_123',
      model: 'o4-mini',
      output: [{ type: 'message', id: 'msg_123', role: 'assistant' }]
    }
  },
  {
    id: 'api-responses-compact',
    title: 'Responses Compact',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/responses/compact',
    description: 'Responses 压缩接口。用于将现有上下文压缩成更短、更适合继续推理的状态，常见于 Codex、agent 长会话自动压缩场景。',
    detail:
      '请求格式与 OpenAI Responses 生态兼容，通常会基于已有 response / conversation 上下文生成新的压缩结果。适合长上下文工作流中的自动整理与续写。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '模型名称，如 o4-mini、gpt-5 系列或其他支持 responses 的模型' },
      { name: 'input', type: 'string | array', required: false, desc: '待压缩的输入内容或消息数组' },
      { name: 'instructions', type: 'string', required: false, desc: '补充压缩指令，如压缩目标、保留重点等' },
      { name: 'reasoning', type: 'object', required: false, desc: '推理配置，如 { "effort": "medium" }' }
    ],
    requestExample: {
      model: 'o4-mini',
      instructions: '请压缩以下客服会话上下文，仅保留后续继续处理工单所需的关键信息。',
      input: [{ role: 'user', type: 'message', content: '用户反馈订单延迟发货，希望确认最新物流状态并申请补偿。' }]
    },
    responseExample: {
      id: 'resp_compact_123',
      object: 'response',
      status: 'completed',
      output: [
        {
          type: 'message',
          id: 'msg_compact_123',
          role: 'assistant',
          content: [{ type: 'output_text', text: '已完成 responses 与 conversations 接口接入，并为资源接口补充日志记录。' }]
        }
      ]
    }
  },
  {
    id: 'api-responses-input-tokens',
    title: 'Responses Input Tokens Count',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/responses/input_tokens/count',
    endpoints: [
      { method: 'POST', endpoint: '/v1/responses/input_tokens/count' },
      { method: 'POST', endpoint: '/v1/responses/input_tokens' }
    ],
    description: 'Responses 输入 token 计数接口。用于在正式发起请求前，估算输入消息消耗的 token 数。',
    detail: '适合在前端预估成本、长上下文截断、自动压缩阈值控制等场景中使用。请求体中需要包含 model 和 input。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '模型名称' },
      { name: 'input', type: 'string | array', required: true, desc: '待计数的输入内容' }
    ],
    requestExample: {
      model: 'o4-mini',
      input: '请先帮我估算这段输入会消耗多少 token。'
    },
    responseExample: {
      input_tokens: 18,
      input_tokens_details: {
        text_tokens: 18,
        image_tokens: 0
      }
    }
  },
  {
    id: 'api-conversations',
    title: 'Conversations',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/conversations',
    endpoints: [
      { method: 'POST', endpoint: '/v1/conversations' },
      { method: 'GET', endpoint: '/v1/conversations/{conversation_id}' },
      { method: 'POST', endpoint: '/v1/conversations/{conversation_id}' },
      { method: 'DELETE', endpoint: '/v1/conversations/{conversation_id}' }
    ],
    description: 'Conversations 会话资源接口。用于创建、读取、更新、删除持久化 conversation 资源，适合多轮 agent 会话管理。',
    detail:
      '通常配合 Responses API 一起使用。创建 conversation 后，可在后续请求中围绕同一个会话对象持续追加内容、查询历史状态或进行资源清理。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'conversation_id', type: 'string (path)', required: false, desc: '已存在的 conversation ID，读取、更新、删除时使用' },
      { name: 'metadata', type: 'object', required: false, desc: '可选的会话元数据' }
    ],
    requestExample: {
      metadata: {
        ticket_id: 'CS-2026-0411',
        channel: 'web-support'
      }
    },
    responseExample: {
      id: 'conv_123',
      object: 'conversation',
      created_at: 1700000000,
      metadata: {
        ticket_id: 'CS-2026-0411',
        channel: 'web-support'
      }
    }
  },
  {
    id: 'api-conversation-items',
    title: 'Conversation Items',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/conversations/{conversation_id}/items',
    endpoints: [
      { method: 'POST', endpoint: '/v1/conversations/{conversation_id}/items' },
      { method: 'GET', endpoint: '/v1/conversations/{conversation_id}/items' },
      { method: 'GET', endpoint: '/v1/conversations/{conversation_id}/items/{item_id}' },
      { method: 'DELETE', endpoint: '/v1/conversations/{conversation_id}/items/{item_id}' }
    ],
    description: 'Conversation Items 子资源接口。用于向 conversation 中追加 item、列出历史 item、读取单个 item 或删除 item。',
    detail:
      '适合需要把用户输入、工具输出、系统记录等结构化内容持续挂载到 conversation 上的工作流。和 Responses API 组合后，可以更方便地维护长期状态。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'conversation_id', type: 'string (path)', required: true, desc: '会话资源 ID' },
      { name: 'item_id', type: 'string (path)', required: false, desc: '单个 item ID，读取或删除时使用' },
      { name: 'type', type: 'string', required: false, desc: 'item 类型，如 message、function_call_output 等' },
      { name: 'role', type: 'string', required: false, desc: '消息角色，如 user、assistant' },
      { name: 'content', type: 'string | array', required: false, desc: 'item 内容' }
    ],
    requestExample: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: '请帮我总结这个订单问题的处理进展，并告诉我下一步需要联系哪个部门。' }]
    },
    responseExample: {
      id: 'item_123',
      object: 'conversation.item',
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: '请帮我总结这个订单问题的处理进展，并告诉我下一步需要联系哪个部门。' }]
    }
  },
  {
    id: 'api-chat-completions',
    title: 'Chat Completions',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/chat/completions',
    description: '对话补全接口，根据提供的对话上下文生成 AI 回复。这是以前最常用的接口，支持多轮对话、流式输出、函数调用等。',
    detail: '发送一组消息（包含系统提示、用户输入、助手回复等），模型会根据上下文生成下一条回复。支持 stream 模式实时输出。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '模型名称，如 gpt-4o、gpt-4o-mini、claude-3.5-sonnet 等' },
      { name: 'messages', type: 'array', required: true, desc: '对话消息数组，每条消息包含 role 和 content' },
      { name: 'stream', type: 'boolean', required: false, desc: '是否使用流式输出，默认 false' },
      { name: 'temperature', type: 'number', required: false, desc: '采样温度 0-2，越高越随机，默认 1' },
      { name: 'max_tokens', type: 'integer', required: false, desc: '最大生成 token 数' },
      { name: 'tools', type: 'array', required: false, desc: '函数调用工具列表，用于 function calling' },
      { name: 'top_p', type: 'number', required: false, desc: '核采样参数，默认 1' }
    ],
    requestExample: {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '你是一个有用的助手。' },
        { role: 'user', content: '你好，请介绍一下你自己。' }
      ],
      stream: false,
      temperature: 0.7
    },
    responseExample: {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '你好！我是一个 AI 助手，很高兴为你服务。' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 25, completion_tokens: 18, total_tokens: 43 }
    }
  },
  {
    id: 'api-embeddings',
    title: 'Embeddings',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/embeddings',
    description: '文本向量化接口。将文本转换为数值向量（embedding），用于语义搜索、文本分类、聚类、推荐系统等场景。',
    detail: '输入文本会被转换为高维浮点数向量。相似语义的文本会产生相近的向量，可通过余弦相似度等方式衡量文本相似性。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '向量化模型，如 text-embedding-3-small、text-embedding-3-large' },
      { name: 'input', type: 'string | array', required: true, desc: '要向量化的文本，可以是单个字符串或字符串数组' },
      { name: 'encoding_format', type: 'string', required: false, desc: '返回格式：float（默认）或 base64' },
      { name: 'dimensions', type: 'integer', required: false, desc: '输出向量维度，部分模型支持' }
    ],
    requestExample: {
      model: 'text-embedding-3-small',
      input: '机器学习是人工智能的一个重要分支'
    },
    responseExample: {
      object: 'list',
      data: [
        {
          object: 'embedding',
          index: 0,
          embedding: [0.0023, -0.0091, 0.0152, '... (1536 dimensions)']
        }
      ],
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 12, total_tokens: 12 }
    }
  },
  {
    id: 'api-images-generations',
    title: 'Image Generation',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/images/generations',
    description: '图像生成接口。通过文字描述生成图片，支持 DALL-E 等模型。',
    detail: '提供文字描述（prompt），模型会生成对应的图片。可以指定图片大小、质量、数量等参数。返回结果为图片 URL 或 Base64 编码数据。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: false, desc: '图像模型，如 dall-e-3、dall-e-2' },
      { name: 'prompt', type: 'string', required: true, desc: '图像描述文本' },
      { name: 'n', type: 'integer', required: false, desc: '生成图片数量，默认 1' },
      { name: 'size', type: 'string', required: false, desc: '图片尺寸：1024x1024、1792x1024、1024x1792' },
      { name: 'quality', type: 'string', required: false, desc: '图片质量：standard 或 hd' },
      { name: 'response_format', type: 'string', required: false, desc: '返回格式：url 或 b64_json' }
    ],
    requestExample: {
      model: 'dall-e-3',
      prompt: '一只穿着宇航服的猫咪在月球上漫步，背景是地球',
      size: '1024x1024',
      quality: 'hd',
      n: 1
    },
    responseExample: {
      created: 1700000000,
      data: [
        {
          url: 'https://example.com/generated-image.png',
          revised_prompt: 'A cat wearing a space suit walking on the moon...'
        }
      ]
    }
  },
  {
    id: 'api-audio-speech',
    title: 'Text to Speech',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/audio/speech',
    description: '文字转语音接口（TTS）。将文本转换为自然流畅的语音音频。',
    detail: '输入文本，选择语音风格和模型，返回 MP3/OPUS/AAC/FLAC 格式的音频数据。支持多种语音角色，适合朗读、语音助手等场景。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: 'TTS 模型，如 tts-1、tts-1-hd' },
      { name: 'input', type: 'string', required: true, desc: '要转换为语音的文本，最长 4096 字符' },
      { name: 'voice', type: 'string', required: true, desc: '语音角色：alloy、echo、fable、onyx、nova、shimmer' },
      { name: 'response_format', type: 'string', required: false, desc: '音频格式：mp3（默认）、opus、aac、flac' },
      { name: 'speed', type: 'number', required: false, desc: '语速 0.25-4.0，默认 1.0' }
    ],
    requestExample: {
      model: 'tts-1',
      input: '你好，欢迎使用 CZLOapi 的文字转语音服务。',
      voice: 'alloy',
      response_format: 'mp3'
    },
    responseExample: '(返回二进制音频数据，Content-Type: audio/mpeg)'
  },
  {
    id: 'api-audio-transcriptions',
    title: 'Audio Transcription',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/audio/transcriptions',
    description: '语音转文字接口（STT）。将音频文件转录为文字内容，支持多种语言自动识别。',
    detail: '上传音频文件（支持 mp3, mp4, mpeg, mpga, m4a, wav, webm 格式），模型会自动识别语言并转录为文字。最大文件大小 25MB。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'multipart/form-data'
    },
    parameters: [
      { name: 'file', type: 'file', required: true, desc: '音频文件（mp3/mp4/wav/webm 等）' },
      { name: 'model', type: 'string', required: true, desc: '转录模型，如 whisper-1' },
      { name: 'language', type: 'string', required: false, desc: '语言代码（ISO-639-1），如 zh、en、ja' },
      { name: 'response_format', type: 'string', required: false, desc: '输出格式：json、text、srt、vtt' },
      { name: 'prompt', type: 'string', required: false, desc: '可选提示词，帮助模型理解音频上下文' }
    ],
    requestExample: '(multipart/form-data)\nfile: @audio.mp3\nmodel: whisper-1\nlanguage: zh',
    responseExample: {
      text: '你好，这是一段测试音频的转录结果。'
    }
  },
  {
    id: 'api-moderations',
    title: 'Content Moderation',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/moderations',
    description: '内容审核接口。检测文本内容是否包含有害、暴力、色情等违规内容。',
    detail: '提交文本后，模型会对多个类别进行分类评分，返回每个类别的违规概率和是否触发标记。适用于用户内容过滤、安全审核等场景。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'input', type: 'string | array', required: true, desc: '要审核的文本内容' },
      { name: 'model', type: 'string', required: false, desc: '审核模型，默认 text-moderation-latest' }
    ],
    requestExample: {
      input: '这是一段需要审核的文本内容。'
    },
    responseExample: {
      id: 'modr-xxx',
      model: 'text-moderation-latest',
      results: [
        {
          flagged: false,
          categories: { sexual: false, hate: false, violence: false, 'self-harm': false },
          category_scores: { sexual: 0.0001, hate: 0.0002, violence: 0.0001, 'self-harm': 0.00005 }
        }
      ]
    }
  },
  {
    id: 'api-rerank',
    title: 'Rerank',
    group: 'OpenAI Compatible',
    method: 'POST',
    endpoint: '/v1/rerank',
    description: '重排序接口。对一组文档按照与查询的相关性进行重新排序，提升搜索和 RAG 系统的检索质量。',
    detail: '输入一个查询和一组候选文档，模型会计算每个文档与查询的相关度分数并排序。常用于 RAG（检索增强生成）系统中的第二阶段精排。',
    headers: {
      Authorization: 'Bearer sk-your-api-key',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '重排序模型名称' },
      { name: 'query', type: 'string', required: true, desc: '查询文本' },
      { name: 'documents', type: 'array', required: true, desc: '候选文档列表' },
      { name: 'top_n', type: 'integer', required: false, desc: '返回前 N 个结果' },
      { name: 'return_documents', type: 'boolean', required: false, desc: '是否在结果中返回文档内容' }
    ],
    requestExample: {
      model: 'rerank-v1',
      query: '如何使用 Python 连接数据库',
      documents: ['Python SQLAlchemy ORM 教程', 'JavaScript Node.js 入门', 'Python psycopg2 PostgreSQL 连接指南', 'Go 语言 Web 开发'],
      top_n: 2
    },
    responseExample: {
      results: [
        { index: 2, relevance_score: 0.95, document: { text: 'Python psycopg2 PostgreSQL 连接指南' } },
        { index: 0, relevance_score: 0.88, document: { text: 'Python SQLAlchemy ORM 教程' } }
      ]
    }
  },
  {
    id: 'api-realtime',
    title: 'Realtime',
    group: 'OpenAI Compatible',
    method: 'GET',
    endpoint: '/v1/realtime',
    description: '实时通信接口（WebSocket）。支持实时语音对话、低延迟流式交互。',
    detail:
      '通过 WebSocket 协议建立持久连接，支持实时语音输入输出、打断功能。适用于语音助手、实时翻译等需要极低延迟的场景。连接建立后通过 JSON 消息进行双向通信。',
    headers: {
      Authorization: 'Bearer sk-your-api-key'
    },
    note: '使用 WebSocket 协议连接，URL 格式: wss://oapi.czl.net/v1/realtime?model=gpt-4o-realtime-preview',
    parameters: [{ name: 'model', type: 'string (query)', required: true, desc: '通过 URL 参数指定模型，如 gpt-4o-realtime-preview' }],
    requestExample: {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: '你是一个友好的语音助手。',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16'
      }
    },
    responseExample: {
      type: 'session.created',
      session: {
        id: 'sess_xxx',
        model: 'gpt-4o-realtime-preview',
        modalities: ['text', 'audio']
      }
    }
  },

  // ========== Claude Native ==========
  {
    id: 'api-claude-messages',
    title: 'Claude Messages',
    group: 'Claude Native',
    method: 'POST',
    endpoint: '/v1/messages',
    description: 'Anthropic Claude 原生消息接口。直接使用 Claude 原生 API 格式调用，保留完整的 Claude 功能特性。',
    detail:
      '使用 Anthropic 原生 API 格式，支持 Claude 的所有高级功能：超长上下文、extended thinking（深度思考）、工具调用、视觉理解等。API Key 通过 x-api-key 请求头传递。',
    headers: {
      'x-api-key': 'sk-your-api-key',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    parameters: [
      { name: 'model', type: 'string', required: true, desc: '模型名称，如 claude-sonnet-4-20250514、claude-opus-4-20250514' },
      { name: 'messages', type: 'array', required: true, desc: '对话消息数组' },
      { name: 'max_tokens', type: 'integer', required: true, desc: '最大输出 token 数' },
      { name: 'system', type: 'string', required: false, desc: '系统提示词' },
      { name: 'stream', type: 'boolean', required: false, desc: '是否流式输出' },
      { name: 'temperature', type: 'number', required: false, desc: '采样温度 0-1' },
      { name: 'tools', type: 'array', required: false, desc: '工具定义列表' },
      { name: 'thinking', type: 'object', required: false, desc: '深度思考配置，如 { "type": "enabled", "budget_tokens": 10000 }' }
    ],
    requestExample: {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: '你是一个专业的技术顾问。',
      messages: [{ role: 'user', content: '请解释一下 WebSocket 的工作原理。' }]
    },
    responseExample: {
      id: 'msg_xxx',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'WebSocket 是一种全双工通信协议...' }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: { input_tokens: 28, output_tokens: 150 }
    }
  },

  // ========== Gemini Native ==========
  {
    id: 'api-gemini-generate',
    title: 'Gemini generateContent',
    group: 'Gemini Native',
    method: 'POST',
    endpoint: '/v1beta/models/{model}:generateContent',
    description: 'Google Gemini 原生内容生成接口。使用 Gemini 原生 API 格式调用，支持多模态输入（文本+图片）。',
    detail: '使用 Google Gemini 原生 API 格式。API Key 通过 URL 参数 ?key= 传递。支持文本、图片等多模态输入，返回格式为 Gemini 原生格式。',
    headers: {
      'Content-Type': 'application/json'
    },
    note: 'API Key 通过 URL 参数传递: ?key=sk-your-api-key。URL 中的 {model} 替换为实际模型名，如 gemini-2.5-pro',
    parameters: [
      { name: 'contents', type: 'array', required: true, desc: '对话内容数组，每个元素包含 parts（支持 text 和 inline_data）' },
      { name: 'generationConfig', type: 'object', required: false, desc: '生成配置，如 temperature、maxOutputTokens、topP 等' },
      { name: 'safetySettings', type: 'array', required: false, desc: '安全过滤设置' },
      { name: 'systemInstruction', type: 'object', required: false, desc: '系统指令' }
    ],
    requestExample: {
      contents: [
        {
          parts: [{ text: '用简洁的语言解释什么是 RESTful API。' }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    },
    responseExample: {
      candidates: [
        {
          content: {
            parts: [{ text: 'RESTful API 是一种基于 REST 架构风格的 Web API 设计规范...' }],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 80, totalTokenCount: 95 }
    }
  },
  {
    id: 'api-gemini-stream',
    title: 'Gemini streamGenerateContent',
    group: 'Gemini Native',
    method: 'POST',
    endpoint: '/v1beta/models/{model}:streamGenerateContent',
    description: 'Google Gemini 流式内容生成接口。与 generateContent 功能相同，但以流式方式逐步返回生成内容。',
    detail: '参数与 generateContent 完全一致，区别在于响应以 SSE（Server-Sent Events）流式返回，适合需要实时展示生成过程的场景。',
    headers: {
      'Content-Type': 'application/json'
    },
    note: 'API Key 通过 URL 参数传递: ?key=sk-your-api-key&alt=sse',
    parameters: [
      { name: 'contents', type: 'array', required: true, desc: '对话内容数组，格式同 generateContent' },
      { name: 'generationConfig', type: 'object', required: false, desc: '生成配置' }
    ],
    requestExample: {
      contents: [
        {
          parts: [{ text: '写一个 Python 快速排序的实现。' }]
        }
      ]
    },
    responseExample: {
      candidates: [
        {
          content: {
            parts: [{ text: 'def quicksort(arr):\n    if len(arr) <= 1:\n        return arr...' }],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ]
    }
  }
];
