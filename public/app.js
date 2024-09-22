// 設定値 (ユーザーに設定できるようにしても良い)
const displayEnglishDelay = 5000;
const nextSentenceDelay = 10000;

// CSVファイルから読み込んだ問題のペア
let sentencePairs = [];
// 現在再生中の問題のインデックス
let currentIndex = 0;
// 一時停止中かどうか
let isPaused = false;

// 自動再生の timer インスタンス
let autoPlayTimer;
// クイズが開始されたかどうか
let quizStarted = false; 

// ファイル選択時のイベントリスナー
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

// 開始ボタンのイベントリスナー
document.getElementById('startButton').addEventListener('click', () => {
    // 開始ボタンを非表示
    document.getElementById('startButton').style.display = 'none';
    // 操作ボタンを表示
    document.getElementById('controls').style.display = 'block';
    // 操作ボタンを有効化
    document.getElementById('prevButton').disabled = false;
    document.getElementById('pauseButton').disabled = false;
    document.getElementById('nextButton').disabled = false;

    // iPhone Safari で音声合成を有効化
    forceEnableSpeechForiPhone();

    // 1秒後にクイズを開始
    setTimeout(startQuiz, 1000);
});

// CSVデータをパースして問題のペアを生成
// CSVデータの形式: "日本語","英語" を想定しており、引用符内に引用符が含まれるケースは想定していない
function parseCSV(data) {
    // CSVデータを改行で分割
    const lines = data.split('\n');

    // 全行を走査して問題のペアを生成
    for (let line of lines) {
        if (!line.trim()) continue; // 空行はスキップ

        const values = [];
        let value = '';
        let insideQuote = false; // 現在が引用符(")の内部かどうか

        // 1行に対して、1文字ずつ走査
        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            // 引用符が出現すれば、内部/外部を切り替える
            if (char === '"') {
                insideQuote = !insideQuote;
            // 引用符の外部でカンマが出現した場合は、値を区切る
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

// クイズを開始する
function startQuiz() {
    quizStarted = true;
    showSentence();
}

function showSentence() {
    if (!quizStarted) {
        // クイズが開始されていない場合は何もしない
        return;
    }

    // 最後の問題までいけば最初に戻る
    if (currentIndex >= sentencePairs.length) {
        currentIndex = 0;
    } else if (currentIndex < 0) { // 「前へ」で最初の問題より戻った場合は最後へ
        currentIndex = sentencePairs.length - 1;
    }

    // 現在の問題の日本語を表示
    const pair = sentencePairs[currentIndex];
    document.getElementById('japaneseSentence').textContent = pair.japanese;
    document.getElementById('englishSentence').style.display = 'none';

    // 日本語を音声合成して再生
    speakText(pair.japanese, 'ja-JP');

    // 進捗状況を更新
    updateProgress();

    // 既存のタイマーをクリア
    clearAllTimer();

    // 一定時間後に英文を表示
    window.displayTimeout = setTimeout(() => {
        document.getElementById('englishSentence').textContent = pair.english;
        document.getElementById('englishSentence').style.display = 'block';

        // 英文を音声合成して再生
        speakText(pair.english, 'en-US');
    }, displayEnglishDelay);

    // 一時停止でない場合のみ自動再生タイマーを設定
    if (!isPaused) {
        autoPlayTimer = setTimeout(() => {
            currentIndex++;
            showSentence();
        }, nextSentenceDelay)
    }
}

function updateProgress() {
    document.getElementById('currentIndex').textContent = currentIndex + 1;
}

// ボタンのイベントリスナー
document.getElementById('nextButton').addEventListener('click', () => {
    currentIndex++;
    
    clearAllTimer();
    
    showSentence();
});

document.getElementById('prevButton').addEventListener('click', () => {
    currentIndex--;

    clearAllTimer();
    
    showSentence();
});

function clearAllTimer() {
    clearTimeout(window.displayTimeout);
    clearTimeout(autoPlayTimer);
}

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
        
        clearAllTimer();
    }
});


function speakText(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // lang に対応する Voice を取得
    // 現在はとりあえず先頭にしているが、選択肢を表示してユーザーに選ばせても良さそう
    const voicesList = window.speechSynthesis.getVoices();
    utterance.voice = voicesList.find((voice) => voice.lang === lang);
    utterance.lang = lang;
    
    speechSynthesis.speak(utterance);
}

// iPhone Safari で音声合成を有効化する
// iOS Safari はユーザーの操作が必要なため、一度ダミー音声合成を実行する必要がある
function forceEnableSpeechForiPhone() {
    // ダミー音声合成を実行
    var speechSynthesis = window.speechSynthesis;
    var utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0; // 音量を0に設定
    speechSynthesis.speak(utterance);
}
