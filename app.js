(function() {
'use strict';

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwDcPRxUvh6Bf8DU4Wu9nj1aSDQ_bzuUe8B-oIr7lxLsx4EIjG_Pdc_JByzSMbSOImt/exec';

const dom = {};
function cacheDom() {
  const ids = [
    'progressBar','stepsWrapper','progressFill',
    'cardPF','cardPJ','camposPJ','groupPIS',
    'cnpjTransportadora','cnpjTransportadoraIcon','cnpjTransportadoraError',
    'nomeMotorista','nomeMotoristaError',
    'cpfMotorista','cpfMotoristaIcon','cpfMotoristaError',
    'pisNis','pisNisError',
    'celular','celularIcon','celularError',
    'tipoVeiculo','tipoVeiculoError',
    'placaVeiculo','placaVeiculoIcon','placaVeiculoError',
    'placaCavalo','placaCavaloIcon','placaCavaloError',
    'placaCarreta2','placaCarreta2Icon','placaCarreta2Error',
    'fileDocMotorista','uploadDocMotorista','previewDocMotorista','docMotoristaError',
    'fileDocVeiculo','uploadDocVeiculo','previewDocVeiculo','docVeiculoError',
    'btnVoltar2','btnProximo2','btnVoltar3','btnProximo3',
    'reviewContent','alertaICMS',
    'checkCNH','checkCRLV','checkEPI','checklistError',
    'resumoEnvio','btnEnviar','enviarSpinner','enviarText',
    'telaEnvio','telaSucesso','telaErro','erroMensagem','btnTentarNovamente',
    'toast','website'
  ];
  ids.forEach(function(id) { dom[id] = document.getElementById(id); });
}

const state = {
  step: 0,
  tipo: null,
  dados: {},
  arquivos: { motorista: null, veiculo: null, motoristaRealType: '', veiculoRealType: '' }
};

function salvarEstado() {
  try {
    sessionStorage.setItem('fobAgendamentoNav', JSON.stringify({
      step: state.step,
      tipo: state.tipo
    }));
  } catch (e) { }
}

function restaurarEstado() {
  try {
    const raw = sessionStorage.getItem('fobAgendamentoNav');
    if (!raw) return;
    const dados = JSON.parse(raw);
    if (dados.tipo) {
      state.tipo = dados.tipo;
      toggleCampos();
    }
    if (typeof dados.step === 'number' && dados.step >= 0 && dados.step <= 2) {
      state.step = dados.step;
    }
  } catch (e) { }
}

function ajustarAlturaPainel() {
  var painel = document.querySelector('.step-panel.active');
  if (painel) {
    var altura = painel.offsetHeight;
    var wrap = document.getElementById('stepsWrapper');
    if (wrap) wrap.style.height = altura + 'px';
  }
}

function steps() { return document.querySelectorAll('.step-item'); }
function wrapper() { return dom.stepsWrapper; }
function progressFill() { return dom.progressFill; }

function updateProgress() {
  const allSteps = steps();
  allSteps.forEach(function(s, i) {
    s.classList.remove('active', 'completed', 'disabled');
    const circle = s.querySelector('.step-circle');
    s.disabled = false;
    s.setAttribute('aria-selected', 'false');
    if (i < state.step) {
      s.classList.add('completed');
      circle.textContent = '\u2713';
    } else if (i === state.step) {
      s.classList.add('active');
      circle.textContent = String(i + 1);
      s.setAttribute('aria-selected', 'true');
    } else {
      s.classList.add('disabled');
      s.disabled = true;
      circle.textContent = String(i + 1);
    }
  });
  progressFill().style.width = (state.step / (allSteps.length - 1)) * 100 + '%';
  wrapper().style.transform = 'translateX(-' + (state.step * 25) + '%)';
  document.querySelectorAll('.step-panel').forEach(function(p, i) {
    p.classList.toggle('active', i === state.step);
  });
  ajustarAlturaPainel();
  setTimeout(ajustarAlturaPainel, 450);
}

function goToStep(n, showErrors) {
  showErrors = showErrors || false;
  if (n < 0 || n > 3) return;
  if (n > state.step && !canAdvanceTo(n, showErrors)) return;
  state.step = n;
  updateProgress();
  salvarEstado();
  if (n === 2) renderReview();
  if (n === 3) renderResumoEnvio();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function canAdvanceTo(n, showErrors) {
  if (n === 1) return !!state.tipo;
  if (n === 2) return validarDados(showErrors);
  if (n === 3) return validarChecklist();
  return false;
}

function bindProgressBar() {
  if (!dom.progressBar) return;
  dom.progressBar.addEventListener('click', function(e) {
    const item = e.target.closest('.step-item');
    if (!item) return;
    const idx = parseInt(item.dataset.step, 10);
    if (idx < state.step) goToStep(idx);
  });
}

function showToast(msg, type) {
  type = type || 'success';
  const toast = dom.toast;
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(function() { toast.classList.remove('show'); }, 4000);
}

function formatCNPJ(v) {
  v = v.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.slice(0, 2) + '.' + v.slice(2);
  if (v.length <= 8) return v.slice(0, 2) + '.' + v.slice(2, 5) + '.' + v.slice(5);
  if (v.length <= 12) return v.slice(0, 2) + '.' + v.slice(2, 5) + '.' + v.slice(5, 8) + '/' + v.slice(8);
  return v.slice(0, 2) + '.' + v.slice(2, 5) + '.' + v.slice(5, 8) + '/' + v.slice(8, 12) + '-' + v.slice(12);
}

function formatCPF(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.slice(0, 3) + '.' + v.slice(3);
  if (v.length <= 9) return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6);
  return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
}

function formatPIS(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 8) return v.slice(0, 3) + '.' + v.slice(3, 8);
  if (v.length <= 10) return v.slice(0, 3) + '.' + v.slice(3, 8) + '.' + v.slice(8, 10);
  return v.slice(0, 3) + '.' + v.slice(3, 8) + '.' + v.slice(8, 10) + '-' + v.slice(10);
}

function formatCelular(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return '(' + v;
  if (v.length <= 7) return '(' + v.slice(0, 2) + ') ' + v.slice(2);
  return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
}

function formatPlaca(v) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  var sum = 0, rest;
  for (var i = 1; i <= 9; i++) sum += parseInt(cpf[i - 1], 10) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (var j = 1; j <= 10; j++) sum += parseInt(cpf[j - 1], 10) * (12 - j);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf[10], 10);
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  var t = cnpj.length - 2, d = cnpj.substring(0, t), dv = cnpj.substring(t);
  var sum = 0, pos = t - 7;
  for (var i = t; i >= 1; i--) { sum += parseInt(d.charAt(t - i), 10) * pos--; if (pos < 2) pos = 9; }
  var res = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (res !== parseInt(dv.charAt(0), 10)) return false;
  t += 1; d = cnpj.substring(0, t); sum = 0; pos = t - 7;
  for (var j = t; j >= 1; j--) { sum += parseInt(d.charAt(t - j), 10) * pos--; if (pos < 2) pos = 9; }
  res = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return res === parseInt(dv.charAt(1), 10);
}

function validarPIS(pis) {
  pis = pis.replace(/\D/g, '');
  if (pis.length !== 11 || /^(\d)\1{10}$/.test(pis)) return false;
  var pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  var sum = 0;
  for (var i = 0; i < 10; i++) sum += parseInt(pis[i], 10) * pesos[i];
  var rest = 11 - (sum % 11);
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(pis[10], 10);
}

function validarPlaca(placa) {
  return /^[A-Z]{3}[0-9]{4}$/.test(placa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa);
}

function validarCelular(v) { return v.replace(/\D/g, '').length === 11; }

function toggleValid(id, isValid) {
  const el = dom[id];
  const icon = dom[id + 'Icon'];
  const err = dom[id + 'Error'];
  if (!el) return isValid;
  el.classList.toggle('error', !isValid);
  if (icon) icon.classList.toggle('show', isValid && el.value.trim() !== '');
  if (err) err.classList.toggle('show', !isValid && el.value.trim() !== '');
  return isValid;
}

function attachMask(id, maskFn, validator) {
  const el = dom[id];
  if (!el) return;
  el.addEventListener('input', function() {
    el.value = maskFn(el.value);
    if (el.value) el.classList.toggle('error', !validator(el.value));
  });
  el.addEventListener('blur', function() { toggleValid(id, validator(el.value)); });
}

var MG_PREFIXES = new Set([
  'GAL','GZM','HOK','MMM','NBP','NLO','NRA','NTC','NXK','NYG','NZA',
  'OAK','OBR','OVR','PBU','PDV','PKB','PMR','POO','PPT','PRG','PTU',
  'PUA','PVR','RBB','RFG','RHD','RLE','RNI','RPA','RSI','SAJ','SCL',
  'SDI','SFR','SGC','SHY','SJK','SLR','SMA','SNB','SPO','SRO','SSA',
  'STD','SUL','SXM','SYI','TAD','TBO','TCV','TEO','TFA','TGO','THA',
  'TIB','TJO','TKM','TLC','TMO','TNA','TOA','TPQ','TQI','TRA','TSI',
  'TTO','TUA','TVB','TWS','TXF','TYI','TZA'
]);

function getUFPlaca(placa) {
  var letras = (placa || '').replace(/[^A-Z]/g, '').slice(0, 3).toUpperCase();
  if (letras.length < 3) return null;
  return MG_PREFIXES.has(letras) ? 'MG' : 'OUT';
}

var FILE_SIGNATURES = [
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { type: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], extra: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } }
];

function detectRealFileType(file) {
  return new Promise(function(resolve) {
    file.slice(0, 16).arrayBuffer().then(function(buf) {
      var arr = new Uint8Array(buf);
      for (var i = 0; i < FILE_SIGNATURES.length; i++) {
        var sig = FILE_SIGNATURES[i];
        var matches = sig.bytes.every(function(b, idx) { return arr[idx] === b; });
        if (matches) {
          if (sig.extra) {
            var extraMatches = sig.extra.bytes.every(function(b, idx) { return arr[sig.extra.offset + idx] === b; });
            if (!extraMatches) continue;
          }
          resolve(sig.type);
          return;
        }
      }
      resolve(null);
    }).catch(function() { resolve(null); });
  });
}

function setupUpload(inputId, boxId, previewId, key) {
  var input = dom[inputId];
  var box = dom[boxId];
  var preview = dom[previewId];
  if (!input || !box) return;

  box.addEventListener('click', function() { input.click(); });
  box.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  box.setAttribute('tabindex', '0');
  box.setAttribute('role', 'button');
  box.addEventListener('dragover', function(e) { e.preventDefault(); box.style.borderColor = 'var(--verde)'; });
  box.addEventListener('dragleave', function() { box.style.borderColor = ''; });
  box.addEventListener('drop', function(e) {
    e.preventDefault(); box.style.borderColor = '';
    input.files = e.dataTransfer.files;
    handleFile(input.files[0]);
  });
  input.addEventListener('change', function() { handleFile(input.files[0]); });

  function handleFile(file) {
    if (!file) return;
    var errId = key === 'motorista' ? 'docMotoristaError' : 'docVeiculoError';
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo deve ter no maximo 5MB', 'error');
      input.value = '';
      return;
    }
    detectRealFileType(file).then(function(realType) {
      if (!realType) {
        showToast('Tipo de arquivo nao suportado. Use JPG, PNG, WebP ou PDF.', 'error');
        input.value = '';
        return;
      }
      state.arquivos[key] = file;
      state.arquivos[key + 'RealType'] = realType;
      dom[errId].classList.remove('show');
      if (realType.indexOf('image/') === 0) {
        var reader = new FileReader();
        reader.onload = function(e) { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(file);
      } else {
        preview.style.display = 'none';
        box.querySelector('div').textContent = '\uD83D\uDCCE ' + file.name;
      }
    });
  }
}

function atualizarCamposPlaca() {
  var tipo = dom.tipoVeiculo.value;
  var g1 = dom.placaVeiculo.closest('.form-group');
  var g2 = dom.placaCavalo.closest('.form-group');
  var g3 = dom.placaCarreta2.closest('.form-group');
  var l1 = g1.querySelector('label');
  var l2 = g2.querySelector('label');

  [g1, g2, g3].forEach(function(g) { g.classList.add('hidden'); });

  if (tipo === 'Bitrem') {
    l2.textContent = 'Placa do cavalo'; l2.className = 'required'; g2.classList.remove('hidden');
    l1.textContent = 'Placa carreta 1'; l1.className = 'required'; g1.classList.remove('hidden');
    var l3 = g3.querySelector('label');
    l3.textContent = 'Placa carreta 2'; l3.className = 'required'; g3.classList.remove('hidden');
  } else if (tipo === 'Carreta aberta' || tipo === 'Graneleira' || tipo === 'Sider' || tipo === 'Ba\u00FA') {
    l2.textContent = 'Placa do cavalo'; l2.className = 'required'; g2.classList.remove('hidden');
    l1.textContent = 'Placa da carreta'; l1.className = 'required'; g1.classList.remove('hidden');
  } else if (tipo === 'Truck convencional' || tipo === 'Truck graneleiro') {
    l1.textContent = 'Placa do veiculo'; l1.className = 'required'; g1.classList.remove('hidden');
  }

  ajustarAlturaPainel();
}

function campoVisivel(id) {
  var el = dom[id];
  if (!el) return false;
  return !el.closest('.form-group').classList.contains('hidden');
}

function validarDados(showErrors) {
  var ok = true;

  if (state.tipo === 'PJ') {
    ok = toggleValid('cnpjTransportadora', validarCNPJ(dom.cnpjTransportadora.value)) && ok;
  }
  ok = toggleValid('nomeMotorista', dom.nomeMotorista.value.trim().length >= 3) && ok;
  ok = toggleValid('cpfMotorista', validarCPF(dom.cpfMotorista.value)) && ok;
  if (state.tipo === 'PF') {
    ok = toggleValid('pisNis', validarPIS(dom.pisNis.value)) && ok;
  }
  ok = toggleValid('celular', validarCelular(dom.celular.value)) && ok;
  ok = toggleValid('tipoVeiculo', !!dom.tipoVeiculo.value) && ok;

  if (campoVisivel('placaVeiculo')) {
    ok = toggleValid('placaVeiculo', validarPlaca(dom.placaVeiculo.value)) && ok;
  }
  if (campoVisivel('placaCavalo')) {
    ok = toggleValid('placaCavalo', validarPlaca(dom.placaCavalo.value)) && ok;
  }
  if (campoVisivel('placaCarreta2')) {
    ok = toggleValid('placaCarreta2', validarPlaca(dom.placaCarreta2.value)) && ok;
  }

  ['motorista', 'veiculo'].forEach(function(k) {
    var errId = 'doc' + k.charAt(0).toUpperCase() + k.slice(1) + 'Error';
    var err = dom[errId];
    if (!state.arquivos[k]) { err.classList.add('show'); ok = false; }
    else err.classList.remove('show');
  });

  if (!ok && showErrors) {
    showToast('Verifique os campos destacados.', 'error');
  }

  return ok;
}

function validarChecklist() {
  var checks = ['checkCNH', 'checkCRLV', 'checkEPI'];
  var ok = checks.every(function(id) { return dom[id].checked; });
  dom.checklistError.classList.toggle('show', !ok);
  return ok;
}

function reviewItem(label, value) {
  var item = document.createElement('div');
  item.className = 'review-item';
  var l = document.createElement('span');
  l.className = 'review-label';
  l.textContent = label;
  var v = document.createElement('span');
  v.className = 'review-value';
  v.textContent = value;
  item.appendChild(l);
  item.appendChild(v);
  return item;
}

function renderReview() {
  var mostraCavalo = campoVisivel('placaCavalo');
  var mostraCarreta2 = campoVisivel('placaCarreta2');
  var tipoVeiculo = dom.tipoVeiculo.value;

  state.dados = {
    tipo: state.tipo,
    nomeMotorista: dom.nomeMotorista.value,
    cpfMotorista: dom.cpfMotorista.value,
    pisNis: state.tipo === 'PF' ? dom.pisNis.value : '',
    cnpjTransportadora: state.tipo === 'PJ' ? dom.cnpjTransportadora.value : '',
    celular: dom.celular.value,
    tipoVeiculo: tipoVeiculo,
    placaVeiculo: dom.placaVeiculo.value,
    placaCavalo: mostraCavalo ? dom.placaCavalo.value : '',
    placaCarreta2: mostraCarreta2 ? dom.placaCarreta2.value : ''
  };

  var section = document.createElement('div');
  section.className = 'review-section';
  var h4 = document.createElement('h4');
  h4.textContent = 'Dados do agendamento';
  section.appendChild(h4);

  section.appendChild(reviewItem('Tipo', state.dados.tipo === 'PF' ? 'Pessoa Fisica' : 'Pessoa Juridica'));
  if (state.dados.cnpjTransportadora) section.appendChild(reviewItem('CNPJ transportadora', state.dados.cnpjTransportadora));
  section.appendChild(reviewItem('Motorista', state.dados.nomeMotorista));
  section.appendChild(reviewItem('CPF', state.dados.cpfMotorista));
  if (state.dados.pisNis) section.appendChild(reviewItem('PIS/NIS', state.dados.pisNis));
  section.appendChild(reviewItem('Celular', state.dados.celular));
  section.appendChild(reviewItem('Veiculo', state.dados.tipoVeiculo));

  if (tipoVeiculo === 'Truck convencional' || tipoVeiculo === 'Truck graneleiro') {
    section.appendChild(reviewItem('Placa do veiculo', state.dados.placaVeiculo));
  } else if (tipoVeiculo === 'Bitrem') {
    section.appendChild(reviewItem('Placa do cavalo', state.dados.placaCavalo));
    section.appendChild(reviewItem('Placa carreta 1', state.dados.placaVeiculo));
    section.appendChild(reviewItem('Placa carreta 2', state.dados.placaCarreta2));
  } else {
    section.appendChild(reviewItem('Placa do cavalo', state.dados.placaCavalo));
    section.appendChild(reviewItem('Placa da carreta', state.dados.placaVeiculo));
  }

  dom.reviewContent.innerHTML = '';
  dom.reviewContent.appendChild(section);

  var placa = state.dados.placaVeiculo;
  var ufPlaca = getUFPlaca(placa);
  dom.alertaICMS.classList.toggle('hidden', !placa || ufPlaca === 'MG');
}

function renderResumoEnvio() {
  var tipoVeiculo = state.dados.tipoVeiculo;
  var section = document.createElement('div');

  section.appendChild(reviewItem('Tipo', state.dados.tipo === 'PF' ? 'Pessoa Fisica' : 'Pessoa Juridica'));
  if (state.dados.cnpjTransportadora) section.appendChild(reviewItem('CNPJ', state.dados.cnpjTransportadora));
  section.appendChild(reviewItem('Motorista', state.dados.nomeMotorista));
  section.appendChild(reviewItem('CPF', state.dados.cpfMotorista));
  if (state.dados.pisNis) section.appendChild(reviewItem('PIS/NIS', state.dados.pisNis));
  section.appendChild(reviewItem('Celular', state.dados.celular));

  var resumoVeiculo = tipoVeiculo;
  if (tipoVeiculo === 'Truck convencional' || tipoVeiculo === 'Truck graneleiro') {
    resumoVeiculo += ' - Placa: ' + state.dados.placaVeiculo;
  } else if (tipoVeiculo === 'Bitrem') {
    resumoVeiculo += ' - Cavalo: ' + state.dados.placaCavalo + ' / Carreta 1: ' + state.dados.placaVeiculo + ' / Carreta 2: ' + state.dados.placaCarreta2;
  } else {
    resumoVeiculo += ' - Cavalo: ' + state.dados.placaCavalo + ' / Carreta: ' + state.dados.placaVeiculo;
  }
  section.appendChild(reviewItem('Veiculo', resumoVeiculo));

  dom.resumoEnvio.innerHTML = '';
  dom.resumoEnvio.appendChild(section);
  dom.telaEnvio.classList.remove('hidden');
  dom.telaSucesso.classList.add('hidden');
  dom.telaSucesso.classList.remove('animate');
  dom.telaErro.classList.add('hidden');
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      if (!reader.result || typeof reader.result !== 'string') {
        reject(new Error('Arquivo vazio ou corrompido'));
        return;
      }
      var result = reader.result.split(',')[1];
      if (!result) reject(new Error('Arquivo vazio ou corrompido'));
      else resolve(result);
    };
    reader.onerror = function() { reject(new Error('Erro ao ler o arquivo.')); };
    reader.readAsDataURL(file);
  });
}

var submitLimiter = { lastSubmit: 0, minInterval: 5000, sending: false };

function enviarAgendamento() {
  if (submitLimiter.sending) return;
  var now = Date.now();
  if (now - submitLimiter.lastSubmit < submitLimiter.minInterval) {
    showToast('Aguarde alguns segundos antes de tentar novamente.', 'warning');
    return;
  }
  if (dom.website.value) return;

  submitLimiter.sending = true;
  submitLimiter.lastSubmit = now;

  var btn = dom.btnEnviar;
  var spinner = dom.enviarSpinner;
  var text = dom.enviarText;

  btn.disabled = true;
  spinner.classList.remove('hidden');
  text.textContent = 'Enviando...';

  var payload = {
    requestId: crypto.randomUUID(),
    tipo: state.dados.tipo,
    nomeMotorista: state.dados.nomeMotorista,
    cpfMotorista: state.dados.cpfMotorista,
    cnpj: state.dados.cnpjTransportadora || '',
    pisNis: state.dados.pisNis || '',
    celular: state.dados.celular,
    tipoVeiculo: state.dados.tipoVeiculo,
    placaVeiculo: state.dados.placaVeiculo,
    placaCavalo: state.dados.placaCavalo,
    placaCarreta2: state.dados.placaCarreta2 || '',
    checklist: 'CNH valida, CRLV em dia, EPIs'
  };

  Promise.all([
    state.arquivos.motorista ? fileToBase64(state.arquivos.motorista) : Promise.resolve(''),
    state.arquivos.veiculo ? fileToBase64(state.arquivos.veiculo) : Promise.resolve('')
  ]).then(function(results) {
    payload.docMotorista = results[0];
    payload.docMotoristaName = state.arquivos.motorista ? state.arquivos.motorista.name : '';
    payload.docMotoristaType = state.arquivos.motoristaRealType || '';
    payload.docVeiculo = results[1];
    payload.docVeiculoName = state.arquivos.veiculo ? state.arquivos.veiculo.name : '';
    payload.docVeiculoType = state.arquivos.veiculoRealType || '';

    fetch(BACKEND_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    }).catch(function() {});

    dom.telaEnvio.classList.add('hidden');
    dom.telaSucesso.classList.remove('hidden');
    dom.telaSucesso.classList.add('animate');
    try { sessionStorage.removeItem('fobAgendamentoNav'); } catch (e) {}

  }).catch(function() {
    dom.telaEnvio.classList.add('hidden');
    dom.telaSucesso.classList.remove('hidden');
    dom.telaSucesso.classList.add('animate');
    try { sessionStorage.removeItem('fobAgendamentoNav'); } catch (e) {}

  }).finally(function() {
    btn.disabled = false;
    spinner.classList.add('hidden');
    text.textContent = 'ENVIAR AGENDAMENTO';
    submitLimiter.sending = false;
  });
}

function dom_bind(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}

function toggleCampos() {
  if (dom.camposPJ) dom.camposPJ.classList.toggle('hidden', state.tipo !== 'PJ');
  if (dom.groupPIS) dom.groupPIS.classList.toggle('hidden', state.tipo !== 'PF');
  ajustarAlturaPainel();
}

function init() {
  cacheDom();

  attachMask('cnpjTransportadora', formatCNPJ, validarCNPJ);
  attachMask('cpfMotorista', formatCPF, validarCPF);
  attachMask('pisNis', formatPIS, validarPIS);
  attachMask('celular', formatCelular, validarCelular);

  ['placaVeiculo', 'placaCavalo', 'placaCarreta2'].forEach(function(id) {
    var el = dom[id];
    if (!el) return;
    el.addEventListener('input', function() { el.value = formatPlaca(el.value); el.classList.remove('error'); });
    el.addEventListener('blur', function() { toggleValid(id, validarPlaca(el.value)); });
  });

  dom_bind(dom.nomeMotorista, 'input', function(e) {
    e.target.value = e.target.value.replace(/[^a-zA-Z\u00C0-\u00FF\s]/g, '').replace(/\s+/g, ' ');
    e.target.classList.remove('error');
  });

  dom_bind(dom.cardPF, 'click', function() { state.tipo = 'PF'; toggleCampos(); goToStep(1); });
  dom_bind(dom.cardPJ, 'click', function() { state.tipo = 'PJ'; toggleCampos(); goToStep(1); });

  setupUpload('fileDocMotorista', 'uploadDocMotorista', 'previewDocMotorista', 'motorista');
  setupUpload('fileDocVeiculo', 'uploadDocVeiculo', 'previewDocVeiculo', 'veiculo');

  dom_bind(dom.tipoVeiculo, 'change', atualizarCamposPlaca);

  dom_bind(dom.btnProximo2, 'click', function() { goToStep(2, true); });
  dom_bind(dom.btnVoltar2, 'click', function() { goToStep(0); });
  dom_bind(dom.btnProximo3, 'click', function() { if (validarChecklist()) goToStep(3); });
  dom_bind(dom.btnVoltar3, 'click', function() { goToStep(1); });

  if (document.getElementById('formDados')) {
    document.getElementById('formDados').addEventListener('submit', function(e) { e.preventDefault(); });
    document.getElementById('formDados').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); goToStep(2, true); }
    });
  }

  dom_bind(dom.btnEnviar, 'click', enviarAgendamento);
  dom_bind(dom.btnTentarNovamente, 'click', function() {
    dom.telaErro.classList.add('hidden');
    dom.telaEnvio.classList.remove('hidden');
  });

  ['placaVeiculo', 'placaCavalo', 'placaCarreta2'].forEach(function(id) {
    var el = dom[id];
    if (el) el.closest('.form-group').classList.add('hidden');
  });

  bindProgressBar();
  restaurarEstado();
  updateProgress();
  ajustarAlturaPainel();
}

// ============ BOOT ============
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    init();
    ajustarAlturaPainel();
  });
} else {
  init();
  ajustarAlturaPainel();
}

window.addEventListener('load', ajustarAlturaPainel);
window.addEventListener('resize', ajustarAlturaPainel);

})();
