class SecureMaskController {
    constructor() {
        this.engine = new SecureMaskEngine();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('executeBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.process();
        });
    }

    process() {
        try {
            const sourceCode = document.getElementById('sourceInput').value.trim();
            if (!sourceCode) throw new Error("入力コードが空です");

            const lang = document.getElementById('langSelect').value;
            const result = this.engine.mask(sourceCode, lang);

            document.getElementById('outputResult').value = result;
            document.getElementById('errorDisplay').style.display = "none";
        } catch (error) {
            const errorBox = document.getElementById('errorDisplay');
            errorBox.textContent = `⚠️ エラー: ${error.message}`;
            errorBox.style.display = "block";
            console.error(`処理失敗: ${error.stack}`);
        }
    }
}

// コントローラーの初期化
new SecureMaskController();
