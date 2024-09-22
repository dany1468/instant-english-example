let displayEnglishDelay = 5000;
let nextSentenceDelay = 10000;
let sentencePairs = [];
let currentIndex = 0;
let isPaused = false;
let autoPlayTimer;
let quizStarted = false; // クイズが開始されたかどうか

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(event) {
            const csvData = event.target.result;
            parseCSV(csvData);
            // 開始ボタンを有効化
            document.getElementById('startButton').disabled = false;
            // 総問題数を表示
            document.getElementById('totalCount').textContent = sentencePairs.length;
        };
        reader.readAsText(file);
    }
});

document.getElementById('startButton').addEventListener('click', () => {
    quizStarted = true;
    // 開始ボタンを非表示
    document.getElementById('startButton').style.display = 'none';
    // 操作ボタンを表示
    document.getElementById('controls').style.display = 'block';
    // 操作ボタンを有効化
    document.getElementById('prevButton').disabled = false;
    document.getElementById('pauseButton').disabled = false;
    document.getElementById('nextButton').disabled = false;

    forceEnableSpeechForiPhone();

    // クイズを開始
    setTimeout(startQuiz, 1000);
});

function parseCSV(data) {
    const lines = data.split('\n');
    for (let line of lines) {
        if (!line.trim()) continue;

        const values = [];
        let value = '';
        let insideQuote = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (insideQuote && line[i + 1] === '"') {
                    value += '"';
                    i++;
                } else {
                    insideQuote = !insideQuote;
                }
            } else if (char === ',' && !insideQuote) {
                values.push(value);
                value = '';
            } else {
                value += char;
            }
        }
        values.push(value);

        if (values.length >= 2) {
            const japanese = values[0].replace(/^"|"$/g, '').replace(/""/g, '"');
            const english = values[1].replace(/^"|"$/g, '').replace(/""/g, '"');
            sentencePairs.push({ japanese, english });
        } else {
            console.error('CSVの形式が正しくありません:', line);
        }
    }
}

function startQuiz() {
    showSentence();
}

function showSentence() {
    if (!quizStarted) {
        // クイズが開始されていない場合は何もしない
        return;
    }

    if (currentIndex >= sentencePairs.length) {
        currentIndex = 0;
    } else if (currentIndex < 0) {
        currentIndex = sentencePairs.length - 1;
    }

    const pair = sentencePairs[currentIndex];
    document.getElementById('japaneseSentence').textContent = pair.japanese;
    document.getElementById('englishSentence').style.display = 'none';

    speakText(pair.japanese, 'ja-JP');

    // 進捗状況を更新
    updateProgress();

    // 既存のタイマーをクリア
    clearTimeout(window.displayTimeout);
    clearTimeout(autoPlayTimer);

    // 一定時間後に英文を表示
    window.displayTimeout = setTimeout(() => {
        document.getElementById('englishSentence').textContent = pair.english;
        document.getElementById('englishSentence').style.display = 'block';
        speakText(pair.english, 'en-US');
    }, 5000); // 5秒後に英文を表示

    // 自動再生が有効な場合のみ次の問題に進むタイマーを設定
    if (!isPaused) {
        autoPlayTimer = setTimeout(() => {
            currentIndex++;
            showSentence();
        }, 10000); // 10秒後に次の問題へ
    }
}

function updateProgress() {
    document.getElementById('currentIndex').textContent = currentIndex + 1;
}

// ボタンのイベントリスナー
document.getElementById('nextButton').addEventListener('click', () => {
    currentIndex++;
    clearTimeout(window.displayTimeout);
    clearTimeout(autoPlayTimer);
    showSentence();
});

document.getElementById('prevButton').addEventListener('click', () => {
    currentIndex--;
    clearTimeout(window.displayTimeout);
    clearTimeout(autoPlayTimer);
    showSentence();
});

const pauseButton = document.getElementById('pauseButton');
pauseButton.addEventListener('click', () => {
    if (isPaused) {
        // 自動再生を再開
        isPaused = false;
        pauseButton.textContent = '一時停止';
        showSentence();
    } else {
        // 自動再生を停止
        isPaused = true;
        pauseButton.textContent = '再開';
        // タイマーをクリア
        clearTimeout(window.displayTimeout);
        clearTimeout(autoPlayTimer);
    }
});


function speakText(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voicesList = window.speechSynthesis.getVoices();
    utterance.voice = voicesList.find((voice) => voice.lang === lang);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
}

function forceEnableSpeechForiPhone() {
    // ダミー音声合成を実行
    var speechSynthesis = window.speechSynthesis;
    var utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0; // 音量を0に設定
    speechSynthesis.speak(utterance);
}
