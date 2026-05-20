// ===== Supabase 연결 정보 (SUPABASE.md 3번 참조) =====
const SUPABASE_URL      = 'https://gmvmedgipagunfjlyquq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QW5pa3p78_UQtlr93q083g_Z_btSieO';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PRIORITIES = ['high', 'medium', 'low'];
const PRIORITY_LABEL = { high: '높음', medium: '중간', low: '낮음' };
const PRIORITY_ICON  = { high: 'keyboard_double_arrow_up', medium: 'remove', low: 'keyboard_double_arrow_down' };

let todos = [];
let selectedPriority = 'medium';
let authMode = 'signin';
let currentUser = null;
let drag = null;

init();

async function init() {
  setupTodoListeners();
  setupAuthListeners();
  await checkAuth();
}

// ===== Auth =====

async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  session ? showApp(session.user) : showAuthScreen();

  sb.auth.onAuthStateChange((_event, session) => {
    session ? showApp(session.user) : showAuthScreen();
  });
}

function showAuthScreen() {
  currentUser = null;
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('user-area').classList.add('app-hidden');
  document.querySelector('.input-card').classList.add('app-hidden');
  document.getElementById('todo-sections').classList.add('app-hidden');
  todos = [];
  renderTodos();

  // 버튼·에러 초기화 (로그아웃 후 재표시 시 이전 상태 제거)
  const btn = document.getElementById('auth-submit');
  btn.disabled = false;
  btn.querySelector('.btn-label').textContent = authMode === 'signin' ? '로그인' : '회원가입';
  document.getElementById('auth-error').textContent = '';
}

async function showApp(user) {
  currentUser = user;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('user-area').classList.remove('app-hidden');
  document.getElementById('user-email').textContent = user.email;
  document.querySelector('.input-card').classList.remove('app-hidden');
  document.getElementById('todo-sections').classList.remove('app-hidden');
  todos = await loadTodos();
  renderTodos();
}

async function handleAuthSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl  = document.getElementById('auth-error');
  const btn      = document.getElementById('auth-submit');

  errorEl.textContent = '';
  errorEl.style.color  = 'var(--high)';

  if (!email || !password) {
    errorEl.textContent = '이메일과 비밀번호를 입력하세요.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
    return;
  }

  btn.disabled = true;
  btn.querySelector('.btn-label').textContent = '처리 중…';

  let error, data;
  if (authMode === 'signin') {
    ({ data, error } = await sb.auth.signInWithPassword({ email, password }));
  } else {
    ({ data, error } = await sb.auth.signUp({ email, password }));
    if (!error && !data.session) {
      // Supabase는 이미 가입된 이메일도 동일 응답 반환 (이메일 열거 방지 정책)
      errorEl.style.color  = 'var(--low)';
      errorEl.textContent  = '이메일을 확인해주세요. 이미 계정이 있다면 로그인 탭을 이용하세요.';
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = '회원가입';
      return;
    }
  }

  if (error) {
    errorEl.style.color  = 'var(--high)';
    errorEl.textContent  = translateAuthError(error.message);
    btn.disabled = false;
    btn.querySelector('.btn-label').textContent = authMode === 'signin' ? '로그인' : '회원가입';
  }
  // 성공 → onAuthStateChange가 showApp() 호출
}

async function handleLogout() {
  await sb.auth.signOut();
  // onAuthStateChange가 showAuthScreen() 호출
}

function translateAuthError(msg) {
  if (msg.includes('Invalid login credentials'))  return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('User already registered'))    return '이미 가입된 이메일입니다.';
  if (msg.includes('Email not confirmed'))        return '이메일 인증이 필요합니다. 받은 편지함을 확인하세요.';
  if (msg.includes('rate limit'))                 return '요청이 너무 많습니다. 잠시 후 다시 시도하세요.';
  return msg;
}

// ===== Event Listeners =====

function setupAuthListeners() {
  // 탭 전환
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      authMode = tab.dataset.mode;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('auth-tab-active'));
      tab.classList.add('auth-tab-active');
      document.getElementById('auth-submit').querySelector('.btn-label').textContent =
        authMode === 'signin' ? '로그인' : '회원가입';
      document.getElementById('auth-error').textContent = '';
      document.getElementById('auth-password').autocomplete =
        authMode === 'signin' ? 'current-password' : 'new-password';
    });
  });

  // 제출
  document.getElementById('auth-submit').addEventListener('click', handleAuthSubmit);
  document.getElementById('auth-email').addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); });
  document.getElementById('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); });

  // 비밀번호 표시 토글
  document.getElementById('pw-toggle').addEventListener('click', () => {
    const pw   = document.getElementById('auth-password');
    const icon = document.getElementById('pw-toggle-icon');
    if (pw.type === 'password') {
      pw.type = 'text';
      icon.textContent = 'visibility_off';
    } else {
      pw.type = 'password';
      icon.textContent = 'visibility';
    }
  });

  // 로그아웃
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

function setupTodoListeners() {
  document.querySelectorAll('.chip[data-priority]').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedPriority = chip.dataset.priority;
      document.querySelectorAll('.chip[data-priority]').forEach(c => {
        c.classList.remove('chip-active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('chip-active');
      chip.setAttribute('aria-checked', 'true');
    });
  });

  document.getElementById('add-btn').addEventListener('click', handleAdd);
  document.getElementById('todo-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdd();
  });

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

// ===== Supabase CRUD =====

async function loadTodos() {
  const { data, error } = await sb
    .from('todos')
    .select('*')
    .order('sort_order');

  if (error) { console.error('loadTodos:', error); return []; }

  return (data || []).sort((a, b) => {
    const pd = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    return pd !== 0 ? pd : a.sort_order - b.sort_order;
  });
}

async function handleAdd() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;

  const group = todos.filter(t => t.priority === selectedPriority);
  const nextOrder = group.length > 0 ? Math.max(...group.map(t => t.sort_order)) + 1 : 1;

  const { data, error } = await sb
    .from('todos')
    .insert([{ text, done: false, priority: selectedPriority, sort_order: nextOrder, user_id: currentUser.id }])
    .select()
    .single();

  if (error) { console.error('handleAdd:', error); return; }

  const lastSameIdx = todos.reduce((acc, t, i) => t.priority === selectedPriority ? i : acc, -1);
  if (lastSameIdx >= 0) {
    todos.splice(lastSameIdx + 1, 0, data);
  } else {
    const rank = PRIORITIES.indexOf(selectedPriority);
    let at = todos.length;
    for (let i = 0; i < todos.length; i++) {
      if (PRIORITIES.indexOf(todos[i].priority) > rank) { at = i; break; }
    }
    todos.splice(at, 0, data);
  }

  input.value = '';
  input.focus();
  renderTodos();
}

async function toggleTodo(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;

  const { error } = await sb.from('todos').update({ done: !t.done }).eq('id', id);
  if (error) { console.error('toggleTodo:', error); return; }

  t.done = !t.done;
  renderTodos();
}

async function deleteTodo(id) {
  const { error } = await sb.from('todos').delete().eq('id', id);
  if (error) { console.error('deleteTodo:', error); return; }

  todos = todos.filter(t => t.id !== id);
  renderTodos();
}

// ===== Render =====

function renderTodos() {
  const container = document.getElementById('todo-sections');
  container.innerHTML = '';

  PRIORITIES.forEach(priority => {
    const group = todos.filter(t => t.priority === priority);

    const section = document.createElement('section');
    section.className = 'priority-section';
    section.dataset.priority = priority;

    const header = document.createElement('div');
    header.className = `section-header priority-${priority}`;
    header.innerHTML = `
      <span class="material-icons-round">${PRIORITY_ICON[priority]}</span>
      <span class="section-title">${PRIORITY_LABEL[priority]}</span>
      <span class="section-count">${group.length}</span>
    `;

    const list = document.createElement('ul');
    list.className = 'section-list';
    list.dataset.priority = priority;

    if (group.length === 0) {
      const hint = document.createElement('li');
      hint.className = 'empty-hint';
      hint.textContent = '여기에 할일을 끌어다 놓으세요';
      list.appendChild(hint);
    } else {
      group.forEach(todo => list.appendChild(createTodoEl(todo)));
    }

    section.append(header, list);
    container.appendChild(section);
  });
}

function createTodoEl(todo) {
  const li = document.createElement('li');
  li.className = `todo-item${todo.done ? ' done' : ''}`;
  li.dataset.id = todo.id;

  const handle = document.createElement('span');
  handle.className = 'material-icons-round drag-handle';
  handle.textContent = 'drag_indicator';
  handle.addEventListener('pointerdown', e => startDrag(e, todo.id, li));

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.done;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;

  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.title = '삭제';
  delBtn.innerHTML = '<span class="material-icons-round">delete_outline</span>';
  delBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.append(handle, checkbox, text, delBtn);
  return li;
}

// ===== Drag and Drop =====

function startDrag(e, todoId, li) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();

  const rect = li.getBoundingClientRect();

  const ghost = li.cloneNode(true);
  ghost.classList.add('drag-ghost');
  ghost.style.width = rect.width + 'px';
  ghost.style.left  = rect.left + 'px';
  ghost.style.top   = rect.top + 'px';
  document.body.appendChild(ghost);

  const placeholder = document.createElement('li');
  placeholder.className = 'drag-placeholder';
  placeholder.style.height = rect.height + 'px';
  li.parentNode.insertBefore(placeholder, li);
  li.classList.add('drag-source');

  e.target.setPointerCapture(e.pointerId);

  drag = { todoId, li, ghost, placeholder, startX: e.clientX, startY: e.clientY };
  document.body.classList.add('dragging');
}

function onPointerMove(e) {
  if (!drag) return;

  drag.ghost.style.transform =
    `translate(${e.clientX - drag.startX}px,${e.clientY - drag.startY}px)`;

  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return;

  const targetList = el.closest('.section-list');
  if (!targetList) return;

  const items = [...targetList.querySelectorAll('.todo-item:not(.drag-source)')];
  let insertBefore = null;
  for (const item of items) {
    const r = item.getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { insertBefore = item; break; }
  }

  if (insertBefore) {
    targetList.insertBefore(drag.placeholder, insertBefore);
  } else {
    targetList.appendChild(drag.placeholder);
  }
}

async function onPointerUp(e) {
  if (!drag) return;

  const { placeholder, li, ghost, todoId } = drag;
  const targetList = placeholder.parentNode;

  if (targetList?.classList.contains('section-list')) {
    const newPriority = targetList.closest('.priority-section').dataset.priority;
    const dragged = todos.find(t => t.id === todoId);

    if (dragged) {
      let afterId = null;
      let passedPh = false;
      for (const child of targetList.children) {
        if (child === placeholder) { passedPh = true; continue; }
        if (passedPh && child.dataset?.id) { afterId = child.dataset.id; break; }
      }

      todos = todos.filter(t => t.id !== todoId);
      dragged.priority = newPriority;

      if (afterId !== null) {
        const refIdx = todos.findIndex(t => t.id === afterId);
        todos.splice(refIdx, 0, dragged);
      } else {
        const rank = PRIORITIES.indexOf(newPriority);
        let at = todos.length;
        for (let i = 0; i < todos.length; i++) {
          if (PRIORITIES.indexOf(todos[i].priority) > rank) { at = i; break; }
        }
        todos.splice(at, 0, dragged);
      }

      // 영향받은 그룹 sort_order 재번호 → 개별 update
      const affectedPriorities = [...new Set([newPriority, dragged.priority])];
      const updateRows = [];
      affectedPriorities.forEach(p => {
        todos
          .filter(t => t.priority === p)
          .forEach((t, idx) => {
            t.sort_order = idx + 1;
            updateRows.push({ id: t.id, priority: t.priority, sort_order: t.sort_order });
          });
      });

      const results = await Promise.all(
        updateRows.map(row =>
          sb.from('todos')
            .update({ priority: row.priority, sort_order: row.sort_order })
            .eq('id', row.id)
        )
      );
      const failed = results.find(r => r.error);
      if (failed) console.error('onPointerUp update:', failed.error);
    }
  }

  ghost.remove();
  placeholder.remove();
  li.classList.remove('drag-source');
  document.body.classList.remove('dragging');
  drag = null;

  renderTodos();
}
