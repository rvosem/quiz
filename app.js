const CORRECT_PIN = "1234"; // ← ИЗМЕНИТЕ НА СВОЙ
const TOPICS = ["Математика", "Физика", "Информатика"]; // ← ДОЛЖНЫ СОВПАДАТЬ С JSON

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let questionStates = [];

// 🔀 Перемешивание массива (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array]; // Копия, чтобы не ломать исходный allQuestions
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// PIN Логика
const pinInput = document.getElementById('pin-input');
const pinBtn = document.getElementById('pin-btn');
const pinError = document.getElementById('pin-error');

pinInput.addEventListener('input', () => {
  if (pinInput.value.length === 4) checkPin();
});
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
  // 🔀 Фильтруем по теме и сразу перемешиваем
  currentQuestions = shuffleArray(allQuestions.filter(q => q.topic === topic));
  if (currentQuestions.length === 0) { alert('Нет вопросов для этой темы'); return; }
  
  correctCount = 0;
  wrongCount = 0;
  questionStates = new Array(currentQuestions.length).fill(null).map(() => ({ answered: false, selected: -1 }));
  currentIndex = 0;
  
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
    btn.textContent = `${String.fromCharCode(65 + i)}) ${opt}`;
    btn.onclick = () => checkAnswer(i, q.correct, btn);
    optionsEl.appendChild(btn);
  });

  // Восстанавливаем состояние, если вопрос уже отвечен
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
  showTopicSelector();
};

window.addEventListener('DOMContentLoaded', () => pinInput.focus());