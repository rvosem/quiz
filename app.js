const CORRECT_PIN = "1111";
const TOPICS = ["KOC", "KXC", "KTC", "test"];

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let questionStates = [];

// Элементы
const liveStatsEl = document.getElementById('live-stats');
const backToTopicsHeaderBtn = document.getElementById('back-to-topics-header-btn');

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateLiveStats() {
  liveStatsEl.textContent = `✅ ${correctCount} | ❌ ${wrongCount}`;
}

// PIN Логика
const pinInput = document.getElementById('pin-input');
const pinBtn = document.getElementById('pin-btn');
const pinError = document.getElementById('pin-error');

pinInput.addEventListener('input', () => { if (pinInput.value.length === 4) checkPin(); });
pinBtn.addEventListener('click', checkPin);

function checkPin() {
  if (pinInput.value === CORRECT_PIN) {
    document.getElementById('pin-overlay').style.display = 'none';
    loadQuestions();
  } else {
    pinError.textContent = 'Неверный PIN';
    pinInput.value = '';
    pinInput.focus();
  }
}

async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Файл не найден');
    allQuestions = await res.json();
    showTopicSelector();
  } catch (err) {
    pinError.textContent = '❌ Ошибка загрузки questions.json';
  }
}

function hideAllScreens() {
  ['topic-select', 'quiz-header', 'quiz-main', 'quiz-footer', 'results-screen']
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
    btn.onclick = () => startQuiz(topic);
    container.appendChild(btn);
  });
  hideAllScreens();
  document.getElementById('topic-select').classList.remove('hidden');
}

function startQuiz(topic) {
  let filtered = allQuestions.filter(q => q.topic === topic);
  if (filtered.length === 0) { alert('Нет вопросов для этой темы'); return; }

  currentQuestions = shuffleArray(filtered);
  currentQuestions = currentQuestions.map(q => {
    let opts = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
    opts = shuffleArray(opts);
    const newCorrect = opts.findIndex(o => o.isCorrect);
    return { question: q.question, options: opts.map(o => o.text), correct: newCorrect };
  });

  correctCount = 0;
  wrongCount = 0;
  questionStates = new Array(currentQuestions.length).fill(null).map(() => ({ answered: false, selected: -1 }));
  currentIndex = 0;
  
  updateLiveStats(); // Обновляем счётчик при старте
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
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(i, q.correct, btn);
    optionsEl.appendChild(btn);
  });

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
  updateLiveStats(); // Обновляем счётчик сразу после ответа
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

// Кнопка возврата из шапки
backToTopicsHeaderBtn.onclick = () => {
  if (confirm('Вернуться к выбору тем? Прогресс текущего теста будет сброшен.')) {
    correctCount = 0; 
    wrongCount = 0;
    updateLiveStats();
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

document.getElementById('back-to-topics-btn').onclick = () => {
  correctCount = 0; 
  wrongCount = 0;
  updateLiveStats();
  showTopicSelector();
};

window.addEventListener('DOMContentLoaded', () => pinInput.focus());