document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat');
    const configBtn = document.getElementById('config-ai');

    // API 設定
    configBtn.addEventListener('click', () => {
        const currentKey = localStorage.getItem('gemini_api_key') || '';
        const input = prompt("請輸入您的 Gemini API Key (密鑰將保存在瀏覽器本地):", currentKey);
        if (input !== null) {
            localStorage.setItem('gemini_api_key', input);
            location.reload(); // 重新整理以套用
        }
    });

    // 自動調整 Textarea 高度
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
        sendBtn.disabled = userInput.value.trim() === '';
    });

    // 發送訊息事件
    const handleSend = () => {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;

        // 模擬諮詢師思考與回覆
        simulateTherapistResponse(text);
    };

    sendBtn.addEventListener('click', handleSend);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('確定要清空對話紀錄嗎？')) {
            chatMessages.innerHTML = `
                <div class="message system-message">
                    <div class="message-content">
                        <p>對話已重置。我是小哈，隨時準備好在這裡傾聽你的心聲。</p>
                    </div>
                </div>
            `;
        }
    });

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `<div class="message-content"><p>${text}</p></div>`;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message therapist-message typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        chatMessages.appendChild(indicator);
        scrollToBottom();
        return indicator;
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function simulateTherapistResponse(userText) {
        const indicator = showTypingIndicator();
        const apiKey = localStorage.getItem('gemini_api_key');

        if (!apiKey) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            indicator.remove();
            addMessage("小哈現在還在「離線狀態」。請點擊右上角的齒輪輸入 Gemini API Key，我才能更有智慧地在那裡陪您聊天！", 'therapist');
            return;
        }

        try {
            const response = await fetchFromGemini(userText, apiKey);
            indicator.remove();
            addMessage(response, 'therapist');
        } catch (error) {
            console.error(error);
            indicator.remove();
            addMessage("哎呀，小哈的腦袋斷線了... 請檢查您的 API Key 或網路連接。錯誤原因：" + error.message, 'therapist');
        }
    }

    async function fetchFromGemini(text, key) {
        const systemPrompt = `你是一位專業且溫暖的情商諮詢師，名字叫「小哈」。
你的講話風格溫柔、謙虛、有耐性，且具備極強的情緒同理心。
【語氣要求】：請像是一個認識很久的「平輩朋友」一樣與使用者對話。語氣要自然、親切，不要使用過於正式或客套的詞彙。
【禁止項目】：絕對不要在回應起頭使用「親愛的」或「親愛的你」這類詞語，這會讓對話顯得有距離感。
你會仔細分析使用者的困擾，避免給予說教，而是透過詢問、肯定與情感陪伴來引導使用者。
請確保每次的回應都是獨一無二的，絕對不要使用公式化的固定語句。
妳也會根據使用者的困難提供一些心理學的小建議，但重點在於情感陪伴。
請直接以小哈的身分回覆，不要包含任何開頭或結尾的標註（如：諮詢師：）。
【重要限制】：回應請保持簡潔，內容長度請嚴格控制在 7 行以內，避免過於贅述。`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\n使用者現在說：「${text}」`
                    }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    topP: 0.95,
                    topK: 64,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Gemini API 請求失敗");
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            throw new Error("Gemini 回傳格式不正確");
        }
    }

    function getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
});
