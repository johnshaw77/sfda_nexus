import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';

/**
 * 聊天設置相關的 composable
 * 提取自 ChatArea.vue 的設置管理邏輯
 */
export function useChatSettings(agent = null) {
  
  // 默認設置
  const defaultSettings = {
    temperature: 0.7,
    maxTokens: 8192,
    fontSize: 14,
    systemPrompt: '',
    useStreamMode: true,
    useRealtimeRender: true,
    thinkingMode: true
  };

  // 響應式狀態
  const chatSettings = ref({ ...defaultSettings });
  const settingsModalVisible = ref(false);

  /**
   * 載入智能體特定的系統提示詞
   */
  const loadAgentSystemPrompt = (currentAgent) => {
    if (currentAgent && currentAgent.id) {
      // 嘗試載入該智能體的自定義系統提示詞
      const agentSettings = JSON.parse(
        localStorage.getItem('agent_settings') || '{}'
      );
      const agentSetting = agentSettings[currentAgent.id];

      if (agentSetting && agentSetting.customSystemPrompt) {
        // 使用智能體的自定義系統提示詞
        chatSettings.value.systemPrompt = agentSetting.customSystemPrompt;
      } else {
        // 使用智能體的默認系統提示詞
        chatSettings.value.systemPrompt = currentAgent.system_prompt || '';
      }
    } else {
      // 沒有選中智能體時，使用全域設定
      const globalPrompt = localStorage.getItem('global_system_prompt');
      chatSettings.value.systemPrompt = globalPrompt || '';
    }
  };

  /**
   * 載入基本聊天設置
   */
  const loadBasicSettings = () => {
    const savedChatSettings = localStorage.getItem('chat_settings');
    if (savedChatSettings) {
      try {
        const settings = JSON.parse(savedChatSettings);
        // 只恢復基本設置，系統提示詞通過 loadAgentSystemPrompt 載入
        chatSettings.value.temperature = settings.temperature || defaultSettings.temperature;
        chatSettings.value.maxTokens = settings.maxTokens || defaultSettings.maxTokens;
        chatSettings.value.fontSize = settings.fontSize || defaultSettings.fontSize;
        chatSettings.value.useStreamMode = settings.useStreamMode !== undefined ? settings.useStreamMode : defaultSettings.useStreamMode;
        chatSettings.value.useRealtimeRender = settings.useRealtimeRender !== undefined ? settings.useRealtimeRender : defaultSettings.useRealtimeRender;
        chatSettings.value.thinkingMode = settings.thinkingMode !== undefined ? settings.thinkingMode : defaultSettings.thinkingMode;
      } catch (error) {
        console.error('恢復聊天設置失敗:', error);
        chatSettings.value = { ...defaultSettings };
      }
    }
  };

  /**
   * 載入所有設置
   */
  const loadAllSettings = (currentAgent = null) => {
    loadBasicSettings();
    loadAgentSystemPrompt(currentAgent);
    
    // 應用字體大小設置
    applyFontSize(chatSettings.value.fontSize);
  };

  /**
   * 保存設置
   */
  const saveSettings = (newSettings, currentAgent = null) => {
    // 更新當前設置
    Object.assign(chatSettings.value, newSettings);

    // 保存基本聊天設置到本地存儲（排除系統提示詞）
    const basicSettings = {
      temperature: chatSettings.value.temperature,
      maxTokens: chatSettings.value.maxTokens,
      fontSize: chatSettings.value.fontSize,
      useStreamMode: chatSettings.value.useStreamMode,
      useRealtimeRender: chatSettings.value.useRealtimeRender,
      thinkingMode: chatSettings.value.thinkingMode,
    };
    localStorage.setItem('chat_settings', JSON.stringify(basicSettings));

    // 如果有選中的智能體，保存該智能體特定的系統提示詞
    if (currentAgent && currentAgent.id) {
      const agentSettings = JSON.parse(
        localStorage.getItem('agent_settings') || '{}'
      );
      agentSettings[currentAgent.id] = {
        customSystemPrompt: chatSettings.value.systemPrompt,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('agent_settings', JSON.stringify(agentSettings));
    } else {
      // 如果沒有選中智能體，保存為全域設定
      localStorage.setItem('global_system_prompt', chatSettings.value.systemPrompt);
    }

    // 應用字體大小設置
    applyFontSize(chatSettings.value.fontSize);

    message.success('設置已保存');
  };

  /**
   * 應用字體大小設置
   */
  const applyFontSize = (fontSize) => {
    document.documentElement.style.setProperty(
      '--chat-font-size',
      `${fontSize}px`
    );
  };

  /**
   * 恢復智能體的默認系統提示詞
   */
  const resetToDefaultPrompt = (currentAgent) => {
    if (currentAgent && currentAgent.system_prompt) {
      chatSettings.value.systemPrompt = currentAgent.system_prompt;
      message.success('已恢復智能體的默認系統提示詞');
      return true;
    }
    return false;
  };

  /**
   * 顯示設置模態框
   */
  const showSettings = () => {
    settingsModalVisible.value = true;
  };

  /**
   * 隱藏設置模態框
   */
  const hideSettings = () => {
    settingsModalVisible.value = false;
  };

  /**
   * 獲取當前設置的副本（用於模態框）
   */
  const getCurrentSettings = () => {
    return { ...chatSettings.value };
  };

  /**
   * 重置所有設置為默認值
   */
  const resetToDefaults = () => {
    chatSettings.value = { ...defaultSettings };
    
    // 清除本地存儲
    localStorage.removeItem('chat_settings');
    localStorage.removeItem('global_system_prompt');
    localStorage.removeItem('agent_settings');
    
    // 應用默認字體大小
    applyFontSize(defaultSettings.fontSize);
    
    message.success('已重置為默認設置');
  };

  /**
   * 導出設置
   */
  const exportSettings = () => {
    const settingsData = {
      chatSettings: chatSettings.value,
      agentSettings: JSON.parse(localStorage.getItem('agent_settings') || '{}'),
      globalPrompt: localStorage.getItem('global_system_prompt'),
      exportTime: new Date().toISOString()
    };

    const dataStr = JSON.stringify(settingsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    message.success('設置已導出');
  };

  /**
   * 導入設置
   */
  const importSettings = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settingsData = JSON.parse(e.target.result);
          
          if (settingsData.chatSettings) {
            Object.assign(chatSettings.value, settingsData.chatSettings);
            localStorage.setItem('chat_settings', JSON.stringify(settingsData.chatSettings));
          }
          
          if (settingsData.agentSettings) {
            localStorage.setItem('agent_settings', JSON.stringify(settingsData.agentSettings));
          }
          
          if (settingsData.globalPrompt) {
            localStorage.setItem('global_system_prompt', settingsData.globalPrompt);
          }
          
          // 應用字體大小
          applyFontSize(chatSettings.value.fontSize);
          
          message.success('設置已導入');
          resolve(settingsData);
        } catch (error) {
          message.error('導入設置失敗：格式錯誤');
          reject(error);
        }
      };
      reader.onerror = () => {
        message.error('讀取檔案失敗');
        reject(new Error('File read error'));
      };
      reader.readAsText(file);
    });
  };

  // 初始化設置
  loadAllSettings(agent);

  return {
    // 響應式狀態
    chatSettings,
    settingsModalVisible,
    
    // 方法
    loadAllSettings,
    loadAgentSystemPrompt,
    saveSettings,
    resetToDefaultPrompt,
    showSettings,
    hideSettings,
    getCurrentSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    applyFontSize,
    
    // 計算屬性
    defaultSettings: computed(() => defaultSettings)
  };
} 