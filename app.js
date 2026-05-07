const CORRECT_PIN = "1234"; // ← ИЗМЕНИТЕ НА СВОЙ
const TOPICS = ["Математика", "Физика", "Информатика"]; // ← ДОЛЖНЫ СОВПАДАТЬ С JSON

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let answered = false;

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
    document.getElementById('pin-error').textContent = '❌ Ошибка загрузки questions.json';
  }
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
  document.getElementById('topic-select').classList.remove('hidden');
}

function startQuiz(topic) {
  currentQuestions = allQuestions.filter(q => q.topic === topic);
  if (currentQuestions.length === 0) { alert('Нет вопросов для этой темы'); return; }
  
  document.getElementById('topic-select').classList.add('hidden');
  document.getElementById('quiz-header').classList.remove('hidden');
  document.getElementById('quiz-main').classList.remove('hidden');
  document.getElementById('quiz-footer').classList.remove('hidden');
  
  currentIndex = 0;
  showQuestion();
}

function showQuestion() {
  const q = currentQuestions[currentIndex];
  document.getElementById('question').textContent = q.question;
  document.getElementById('counter').textContent = `${currentIndex + 1} / ${currentQuestions.length}`;
  document.getElementById('feedback').textContent = '';
  answered = false;

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = `${String.fromCharCode(65 + i)}) ${opt}`;
    btn.onclick = () => checkAnswer(i, q.correct, btn);
    optionsEl.appendChild(btn);
  });

  document.getElementById('prev-btn').disabled = currentIndex === 0;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = currentIndex === currentQuestions.length - 1 ? 'Завершить' : 'Далее →';
  nextBtn.disabled = false;
}

function checkAnswer(selected, correct, clickedBtn) {
  if (answered) return;
  answered = true;
  const allBtns = document.querySelectorAll('.opt-btn');
  allBtns.forEach(b => b.classList.add('disabled'));

  const feedback = document.getElementById('feedback');
  if (selected === correct) {
    clickedBtn.classList.add('correct');
    feedback.textContent = '✅ Верно';
    feedback.style.color = 'var(--correct)';
  } else {
    clickedBtn.classList.add('wrong');
    allBtns[correct].classList.add('correct');
    feedback.textContent = '❌ Неверно';
    feedback.style.color = 'var(--wrong)';
  }
}

document.getElementById('next-btn').onclick = () => {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    showQuestion();
  } else {
    if (confirm('Тест завершён. Вернуться к выбору темы?')) {
      location.reload();
    }
  }
};

document.getElementById('prev-btn').onclick = () => {
  if (currentIndex > 0) { currentIndex--; showQuestion(); }
};

// Автофокус на PIN при загрузке
window.addEventListener('DOMContentLoaded', () => pinInput.focus());