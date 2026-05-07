const CORRECT_PIN = "1234";
const TOPICS = ["KOC", "KXC", "KTC", "test"];
const RANGE_SIZE = 100; // Размер пачки вопросов

let allQuestions = [];
let currentQuestions = []; // Вопросы текущей пачки
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let questionStates = [];

// Элементы UI
const pinInput = document.getElementById('pin-input');
const keypad = document.querySelector('.pin-keypad');
const liveStatsEl = document.getElementById('live-stats');

// --- PIN ЛОГИКА ---
keypad.addEventListener('click', (e) => {
  if (e.target.classList.contains('key-btn')) {
    const num = e.target.dataset.num;
    if (num === 'back') {
      pinInput.value = pinInput.value.slice(0, -1);
      document.getElementById('pin-error').textContent = '';
    } else {
      if (pinInput.value.length < 4) {
        pinInput.value += num;
        document.getElementById('pin-error').textContent = '';
        if (pinInput.value.length === 4) checkPin();
      }
    }
  }
});

function checkPin() {
  if (pinInput.value === CORRECT_PIN) {
    document.getElementById('pin-overlay').style.display = 'none';
    loadQuestions();
  } else {
    document.getElementById('pin-error').textContent = 'Неверный PIN';
    pinInput.value = '';
    if (navigator.vibrate) navigator.vibrate(200);
  }
}

// --- ЗАГРУЗКА И МЕНЮ ---
async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Файл не найден');
    allQuestions = await res.json();
    showTopicSelector();
  } catch (err) {
    document.getElementById('pin-error').textContent = '❌ Ошибка загрузки JSON';
  }
}

function hideAllScreens() {
  ['topic-select', 'range-select', 'quiz-header', 'quiz-main', 'quiz-footer', 'results-screen']
    .forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showTopicSelector() {
  const container = document.getElementById('topics-container');
  container.innerHTML = '';
  TOPICS.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'topic-btn';
    const count = allQuestions.filter(q => q.topic === topic).length;
    btn.textContent = `${topic} (${count} вопр.)`;
    btn.onclick = () => showRangeSelector(topic);
    container.appendChild(btn);
  });
  hideAllScreens();
  document.getElementById('topic-select').classList.remove('hidden');
}

function showRangeSelector(topic) {
  const filtered = allQuestions.filter(q => q.topic === topic);
  const container = document.getElementById('ranges-container');
  document.getElementById('range-title').textContent = topic;
  container.innerHTML = '';

  // Создаем кнопки диапазонов
  for (let i = 0; i < filtered.length; i += RANGE_SIZE) {
    const end = Math.min(i + RANGE_SIZE, filtered.length);
    const btn = document.createElement('button');
    btn.className = 'range-btn';
    btn.textContent = `Вопросы ${i + 1} - ${end}`;
    btn.onclick = () => startQuiz(filtered.slice(i, end)); // Передаем срез вопросов
    container.appendChild(btn);
  }

  hideAllScreens();
  document.getElementById('range-select').classList.remove('hidden');
}

document.getElementById('back-to-topics-from-range').onclick = showTopicSelector;

// --- ТЕСТ ---
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startQuiz(questionsChunk) {
  currentQuestions = questionsChunk;
  
  // Перемешиваем ВАРИАНТЫ ОТВЕТОВ внутри каждого вопроса
  currentQuestions = currentQuestions.map(q => {
    let opts = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
    opts = shuffleArray(opts);
    return {
      question: q.question,
      options: opts.map(o => o.text),
      correct: opts.findIndex(o => o.isCorrect)
    };
  });

  // Сброс статистики
  correctCount = 0;
  wrongCount = 0;
  questionStates = new Array(currentQuestions.length).fill(null).map(() => ({ answered: false, selected: -1 }));
  currentIndex = 0;
  
  updateLiveStats();
  hideAllScreens();
  document.getElementById('quiz-header').classList.remove('hidden');
  document.getElementById('quiz-main').classList.remove('hidden');
  document.getElementById('quiz-footer').classList.remove('hidden');
  showQuestion();
}

function showQuestion() {
  const q = currentQuestions[currentIndex];
  document.getElementById('question').textContent = q.question;
  document.getElementById('counter').textContent = `${currentIndex + 1} / ${currentQuestions.length}`;
  document.getElementById('feedback').textContent = '';

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt; // Просто текст, без букв
    btn.onclick = () => checkAnswer(i, q.correct, btn);
    optionsEl.appendChild(btn);
  });

  // Восстановление состояния (если нажали Назад)
  const state = questionStates[currentIndex];
  if (state.answered) {
    const btns = optionsEl.querySelectorAll('.opt-btn');
    btns.forEach(b => b.classList.add('disabled'));
    btns[q.correct].classList.add('correct');
    if (state.selected !== q.correct) {
      btns[state.selected].classList.add('wrong');
      document.getElementById('feedback').textContent = '❌ Было неверно';
      document.getElementById('feedback').style.color = 'var(--wrong)';
    } else {
      document.getElementById('feedback').textContent = '✅ Верно';
      document.getElementById('feedback').style.color = 'var(--correct)';
    }
  }

  document.getElementById('prev-btn').disabled = currentIndex === 0;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = currentIndex === currentQuestions.length - 1 ? 'Завершить' : 'Далее →';
  nextBtn.disabled = false;
}

function checkAnswer(selected, correct, clickedBtn) {
  const state = questionStates[currentIndex];
  if (state.answered) return;
  
  state.answered = true;
  state.selected = selected;
  
  const btns = document.querySelectorAll('.opt-btn');
  btns.forEach(b => b.classList.add('disabled'));
  
  if (selected === correct) {
    clickedBtn.classList.add('correct');
    correctCount++;
    document.getElementById('feedback').textContent = '✅ Верно';
    document.getElementById('feedback').style.color = 'var(--correct)';
  } else {
    clickedBtn.classList.add('wrong');
    btns[correct].classList.add('correct');
    wrongCount++;
    document.getElementById('feedback').textContent = '❌ Неверно';
    document.getElementById('feedback').style.color = 'var(--wrong)';
  }
  updateLiveStats();
}

function updateLiveStats() {
  liveStatsEl.textContent = `✅ ${correctCount} | ❌ ${wrongCount}`;
}

document.getElementById('next-btn').onclick = () => {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    showQuestion();
  } else {
    showResults();
  }
};

document.getElementById('prev-btn').onclick = () => {
  if (currentIndex > 0) { currentIndex--; showQuestion(); }
};

document.getElementById('back-to-topics-header-btn').onclick = () => {
  if (confirm('Вернуться к выбору тем? Прогресс будет сброшен.')) {
    showTopicSelector();
  }
};

function showResults() {
  hideAllScreens();
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('res-correct').textContent = correctCount;
  document.getElementById('res-wrong').textContent = wrongCount;
  document.getElementById('res-total').textContent = currentQuestions.length;
}

document.getElementById('back-to-topics-btn').onclick = showTopicSelector;

window.addEventListener('DOMContentLoaded', () => pinInput.focus());