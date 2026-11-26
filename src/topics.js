// 词典：话题、品牌、年度关键词、城市。英文词按单词边界匹配（自动兼容复数），中文按子串匹配。
// 想加新话题、新品牌？改这个文件，开 PR 就行。
(function (root) {
  const TOPICS = [
    {
      id: 'agent', name: 'AI Agent', color: '#7C5CFF',
      words: ['claude', 'codex', 'agent', 'skill', 'mcp', 'openclaw', '龙虾', 'clawdbot', 'cursor', 'chatgpt', 'gpt', 'llm',
        '大模型', 'prompt', '提示词', 'gemini', 'grok', 'anthropic', 'openai', 'deepseek', 'kimi', '智能体', 'token', 'ai 编程',
        'copilot', 'workbuddy', 'manus', 'context engineering', '上下文', 'subagent', 'rag', 'ai 助手', 'ai agent'],
    },
    {
      id: 'dev', name: '开发与开源', color: '#00C2FF',
      words: ['github', '开源', '代码', '编程', 'api', 'cli', '前端', '后端', 'deploy', 'react', 'python', 'repo', 'vibe coding',
        'vibecoding', '独立开发', 'next.js', 'vercel', 'supabase', 'docker', 'open source', 'typescript', '插件', '仓库',
        'chrome 扩展', '小程序', 'app', '服务器', '数据库', 'sdk', 'framework', 'developer', '程序员'],
    },
    {
      id: 'money', name: '搞钱与出海', color: '#FFB800',
      words: ['变现', '月入', 'arr', 'mrr', '美金', '赚钱', '副业', '出海', 'saas', '创业', '闲鱼', '收入', '营收',
        '付费', '盈利', '卖铲子', '商业模式', 'revenue', 'startup', 'founder', '一人公司', '赚了', '万刀', '第一桶金',
        '带货', '电商', '客户', '订阅', 'side hustle', 'solopreneur', '被动收入'],
    },
    {
      id: 'content', name: '内容与流量', color: '#FF4D8D',
      words: ['小红书', '抖音', '起号', '爆款', '流量', '粉丝', '涨粉', 'hook', '文案', '视频号', 'youtube', '播放', '选题',
        '公众号', '博主', '内容创作', 'tiktok', 'viral', '自媒体', '口播', '标题', 'followers', 'storytelling', 'creator',
        '写作', 'writing', 'audience', '算法推荐', '切片', '剪辑', 'newsletter'],
    },
    {
      id: 'aigc', name: 'AI 绘画与视频', color: '#FF7A45',
      words: ['seedance', '换装', '写真', '生图', 'midjourney', 'veo', 'kling', '可灵', '即梦', 'nano banana', 'sora',
        '视频生成', 'ai 视频', '短片', '分镜', 'comfyui', 'flux', '数字人', 'avatar', 'live photo', '图生视频', '文生图', 'imagine'],
    },
    {
      id: 'invest', name: '投资与交易', color: '#22C55E',
      words: ['美股', '股票', '期权', '交易', '回测', '选股', '基金', '加密', 'btc', '比特币', '行情', '投资', 'crypto', 'etf',
        '纳指', '财报', '仓位', 'a股', '港股', 'trading', 'stock', '估值', '牛市', '熊市', '海力士', '英伟达', 'nvidia',
        '光模块', '半导体', '波动率', '强平', 'setup', 'price action', '做空', '做多', '量化'],
    },
    {
      id: 'design', name: '设计与审美', color: '#E879F9',
      words: ['设计', 'ui', 'ux', 'figma', '配色', '字体', '品牌', '审美', 'logo', '排版', 'design', '海报', '视觉', '动效',
        'landing page', '交互', 'typography'],
    },
    {
      id: 'learn', name: '学习与阅读', color: '#38BDF8',
      words: ['英语', '口语', '学习', '教程', '课程', '读书', '书单', '播客', 'podcast', '笔记', 'obsidian', '知识库', '论文',
        '保姆级', '入门', '指南', 'guide', 'tutorial', 'learn', '必读', '演讲', 'well-spoken', '表达', '思维模型', 'book'],
    },
    {
      id: 'productivity', name: '效率与工作流', color: '#A3E635',
      words: ['效率', '工作流', 'workflow', '自动化', 'notion', 'raycast', '工具推荐', '神器', '快捷键', 'automation', 'n8n',
        '飞书', '提效', '一键', 'productivity', '浏览器'],
    },
    {
      id: 'life', name: '生活与人生', color: '#FB7185',
      words: ['健康', '睡眠', '旅游', '旅行', '美签', '健身', '人生', '心理', '关系', '焦虑', '幸福', '婚姻', '育儿', '饮食',
        '减肥', '冥想', '成长', '认知', '移民', '签证', '肩颈', '拉伸', '女神', '穿搭', 'habit', 'life'],
    },
  ];

  // 品牌只用文字展示，不用官方 logo（避免看起来像官方背书）
  const BRANDS = [
    { id: 'claude', name: 'Claude', color: '#D97757', words: ['claude', 'anthropic'] },
    { id: 'codex', name: 'Codex', color: '#10A37F', words: ['codex'] },
    { id: 'openai', name: 'ChatGPT', color: '#74AA9C', words: ['chatgpt', 'openai', 'gpt-4', 'gpt-5', 'gpt4', 'gpt5', 'sora'] },
    { id: 'openclaw', name: 'OpenClaw', color: '#FF5A5F', words: ['openclaw', 'clawdbot', 'moltbot', '龙虾'] },
    { id: 'gemini', name: 'Gemini', color: '#4C8DF6', words: ['gemini', 'nano banana', 'veo'] },
    { id: 'grok', name: 'Grok', color: '#BBBBBB', words: ['grok'] },
    { id: 'cursor', name: 'Cursor', color: '#8E8EA0', words: ['cursor'] },
    { id: 'deepseek', name: 'DeepSeek', color: '#4D6BFE', words: ['deepseek'] },
    { id: 'kimi', name: 'Kimi', color: '#A0A0FF', words: ['kimi', 'moonshot'] },
    { id: 'manus', name: 'Manus', color: '#CCCCCC', words: ['manus'] },
    { id: 'workbuddy', name: 'WorkBuddy', color: '#3BA2FF', words: ['workbuddy'] },
    { id: 'seedance', name: 'Seedance', color: '#FF7A45', words: ['seedance', '即梦'] },
    { id: 'midjourney', name: 'Midjourney', color: '#E0E0E0', words: ['midjourney'] },
    { id: 'kling', name: '可灵', color: '#22D3EE', words: ['kling', '可灵'] },
    { id: 'obsidian', name: 'Obsidian', color: '#8B5CF6', words: ['obsidian'] },
    { id: 'notion', name: 'Notion', color: '#E5E5E5', words: ['notion'] },
  ];

  // 年度关键词候选：命中条数最多的会上榜
  const KEYWORDS = ['Skill', 'Agent', '龙虾', 'Claude Code', 'Codex', 'MCP', 'Vibe Coding', ['提示词', 'Prompt'], '工作流',
    '变现', '出海', '一人公司', '卖铲子', '保姆级', '开源', '小红书', '副业', '搞钱', '起号', '爆款', '美股', '期权',
    '自动化', '数字人', 'GitHub', 'SaaS', '独立开发', '认知', 'Hook', '知识库', '复利', '护城河', '信息差',
    '第一性原理', '底层逻辑', '闭环', '赛道', 'ARR', '神器', '天花板', '卧槽', '颠覆', '杀疯了', '炸裂'];

  const CITIES = [
    [/san francisco|\bsf\b|bay area|旧金山|湾区/i, '旧金山湾区'],
    [/beijing|北京/i, '北京'], [/shanghai|上海/i, '上海'], [/shenzhen|深圳/i, '深圳'], [/guangzhou|广州/i, '广州'],
    [/hangzhou|杭州/i, '杭州'], [/chengdu|成都/i, '成都'], [/hong ?kong|香港|\bhk\b/i, '香港'],
    [/taipei|台北|taiwan|台湾/i, '台湾'], [/singapore|新加坡/i, '新加坡'], [/tokyo|东京|japan|日本/i, '日本'],
    [/seoul|首尔|korea|韩国/i, '韩国'], [/los angeles|\bla\b|洛杉矶/i, '洛杉矶'], [/new york|\bnyc\b|纽约/i, '纽约'],
    [/seattle|西雅图/i, '西雅图'], [/chicago|芝加哥/i, '芝加哥'], [/austin/i, '奥斯汀'], [/london|伦敦/i, '伦敦'],
    [/paris|巴黎/i, '巴黎'], [/berlin|柏林/i, '柏林'], [/toronto|vancouver|canada|加拿大/i, '加拿大'],
    [/sydney|melbourne|australia|澳洲|澳大利亚/i, '澳洲'], [/dubai|迪拜/i, '迪拜'],
    [/california|\bca\b|加州/i, '加州'], [/united states|\busa?\b|美国/i, '美国'], [/china|中国/i, '中国'],
  ];

  // 人格：按「排名第一的话题」决定（第一名占比低于 15% 时为「杂食信息猎人」）。口号用第一人称，卡片是「我」在晒
  const PERSONAS = {
    agent: { name: 'Agent 驯兽师', line: '别人还在聊天，我已经让 AI 替我打工了。' },
    dev: { name: '开源仓库收割机', line: 'Star 先点上，代码以后我一定看。' },
    money: { name: '搞钱雷达', line: '每一条「月入 X 万」都没逃过我的眼睛。' },
    content: { name: '流量炼金术士', line: '内容背后的人性，才是我真正在研究的。' },
    aigc: { name: 'AI 导演', line: '提示词是我的分镜，模型是我的剧组。' },
    invest: { name: '华尔街夜读生', line: '白天上班，晚上复盘，收藏夹就是我的研报库。' },
    design: { name: '审美强迫症', line: '丑的东西，我多看一眼都觉得累。' },
    learn: { name: '终身学习者', line: '收藏 = 学会，这是我今年最美的错觉。' },
    productivity: { name: '效率狂魔', line: '为了省 5 分钟，我愿意折腾 5 小时。' },
    life: { name: '人间清醒派', line: '我刷的是推特，想的是人生。' },
    other: { name: '杂食信息猎人', line: '没有标签能定义我，收藏夹就是我的百科全书。' },
  };

  const api = { TOPICS, BRANDS, KEYWORDS, CITIES, PERSONAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BW_TOPICS = api;
})(typeof window !== 'undefined' ? window : globalThis);
