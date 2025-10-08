// Modal controls
function showLoginModal() {
	openModal('loginModal');
}

function showSignupModal() {
	openModal('signupModal');
}

function openModal(id) {
	var modal = document.getElementById(id);
	if (modal) modal.style.display = 'block';
}

function closeModal(id) {
	var modal = document.getElementById(id);
	if (modal) modal.style.display = 'none';
}

function scrollToSection(id) {
	var el = document.getElementById(id);
	if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Navbar mobile toggle
(function initNavbar() {
	var hamburger = document.querySelector('.hamburger');
	var navMenu = document.querySelector('.nav-menu');
	if (hamburger && navMenu) {
		hamburger.addEventListener('click', function () {
			navMenu.classList.toggle('active');
		});
		document.querySelectorAll('.nav-link').forEach(function (n) {
			n.addEventListener('click', function () {
				navMenu.classList.remove('active');
			});
		});
	}
})();

// Simple auth using localStorage
var AUTH_STORAGE_KEY = 'cc_users';
var SESSION_KEY = 'cc_session_email';

function getUsers() {
	var raw = localStorage.getItem(AUTH_STORAGE_KEY);
	try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
}

function setUsers(users) {
	localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

function setSession(email) {
	if (email) localStorage.setItem(SESSION_KEY, email);
	else localStorage.removeItem(SESSION_KEY);
	updateAuthUI();
}

function getSession() {
	return localStorage.getItem(SESSION_KEY);
}

// Preload hardcoded account
(function seedHardcodedAccount() {
	var users = getUsers();
	if (!users['giritharand3@gmail.com']) {
		users['giritharand3@gmail.com'] = { password: '12345678', createdAt: Date.now() };
		setUsers(users);
	}
})();

// Auth UI handlers
function updateAuthUI() {
	var email = getSession();
	var loginBtn = document.querySelector('.login-btn');
	var signupBtn = document.querySelector('.signup-btn');
	if (email) {
		if (loginBtn) {
			loginBtn.textContent = 'Logout';
			loginBtn.onclick = function () { setSession(null); };
		}
		if (signupBtn) {
			signupBtn.textContent = email;
			signupBtn.disabled = true;
		}
	} else {
		if (loginBtn) {
			loginBtn.textContent = 'Login';
			loginBtn.onclick = showLoginModal;
		}
		if (signupBtn) {
			signupBtn.textContent = 'Sign Up';
			signupBtn.disabled = false;
			signupBtn.onclick = showSignupModal;
		}
	}
}

// Forms
document.addEventListener('DOMContentLoaded', function () {
	updateAuthUI();

	var loginForm = document.getElementById('loginForm');
	if (loginForm) {
		loginForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var email = (document.getElementById('loginEmail') || {}).value || '';
			var password = (document.getElementById('loginPassword') || {}).value || '';
			var users = getUsers();
			if (users[email] && users[email].password === password) {
				setSession(email);
				closeModal('loginModal');
				showSuccess('Logged in', 'You have been logged in successfully.');
				// Guide user to upload immediately after login
				setTimeout(function(){ scrollToSection('upload'); }, 300);
				// Remind if no document uploaded shortly after login
				setTimeout(function(){
					var uploadedFiles = document.getElementById('uploadedFiles');
					var count = uploadedFiles ? uploadedFiles.children.length : 0;
					if (count === 0) {
						showSuccess('Reminder', 'You should upload a document after your login');
					}
				}, 8000);
			} else {
				showErrorInline(loginForm, 'Invalid email or password');
			}
		});
	}

	var signupForm = document.getElementById('signupForm');
	if (signupForm) {
		signupForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var email = (document.getElementById('signupEmail') || {}).value || '';
			var password = (document.getElementById('signupPassword') || {}).value || '';
			var confirm = (document.getElementById('confirmPassword') || {}).value || '';
			if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
				showErrorInline(signupForm, 'Please enter a valid email');
				return;
			}
			if (password.length < 6) {
				showErrorInline(signupForm, 'Password must be at least 6 characters');
				return;
			}
			if (password !== confirm) {
				showErrorInline(signupForm, 'Passwords do not match');
				return;
			}
			var users = getUsers();
			if (users[email]) {
				showErrorInline(signupForm, 'Account already exists');
				return;
			}
			users[email] = { password: password, createdAt: Date.now() };
			setUsers(users);
			setSession(email);
			closeModal('signupModal');
			showSuccess('Account created', 'Your account has been created successfully.');
		});
	}

	initUpload();

	// Export buttons
	var exportPdfBtn = document.getElementById('exportPdfBtn');
	if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportChecklistToPDF);
	var exportDocxBtn = document.getElementById('exportDocxBtn');
	if (exportDocxBtn) exportDocxBtn.addEventListener('click', exportChecklistToDOCX);
});

function showSuccess(title, message) {
	var t = document.getElementById('successTitle');
	var m = document.getElementById('successMessage');
	if (t) t.textContent = title || 'Success';
	if (m) m.textContent = message || '';
	openModal('successModal');
}

function showErrorInline(form, msg) {
	var existing = form.querySelector('.form-error');
	if (existing) existing.remove();
	var p = document.createElement('p');
	p.className = 'form-error';
	p.style.color = '#e63946';
	p.style.marginTop = '10px';
	p.textContent = msg;
	form.appendChild(p);
}

// Upload handling
function initUpload() {
	var uploadArea = document.getElementById('uploadArea');
	var fileInput = document.getElementById('fileInput');
	var uploadedFiles = document.getElementById('uploadedFiles');

	function preventDefaults(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
		if (uploadArea) uploadArea.addEventListener(eventName, preventDefaults, false);
	});

	['dragenter', 'dragover'].forEach(function (eventName) {
		if (uploadArea) uploadArea.addEventListener(eventName, function () {
			uploadArea.classList.add('dragover');
		});
	});

	['dragleave', 'drop'].forEach(function (eventName) {
		if (uploadArea) uploadArea.addEventListener(eventName, function () {
			uploadArea.classList.remove('dragover');
		});
	});

	if (uploadArea) uploadArea.addEventListener('drop', function (e) {
		if (!getSession()) { showSuccess('Login required', 'You should upload a document after your login'); return; }
		var dt = e.dataTransfer;
		var files = dt ? dt.files : null;
		if (files && files.length) handleFiles(files);
	});

	if (fileInput) fileInput.addEventListener('change', function (e) {
		if (!getSession()) { showSuccess('Login required', 'You should upload a document after your login'); e.target.value = ''; return; }
		var files = e.target.files;
		if (files && files.length) handleFiles(files);
	});

	function handleFiles(fileList) {
		Array.prototype.forEach.call(fileList, function (file) {
			addFileItem(file);
			processFileForChecklist(file);
		});
	}

	function addFileItem(file) {
		if (!uploadedFiles) return;
		var item = document.createElement('div');
		item.className = 'file-item';
		item.innerHTML = '\n\t\t\t<div class="file-info">\n\t\t\t\t<div class="file-icon"><i class="fas fa-file"></i></div>\n\t\t\t\t<div class="file-details">\n\t\t\t\t\t<h4>' + escapeHtml(file.name) + '</h4>\n\t\t\t\t\t<p>' + Math.round(file.size / 1024) + ' KB</p>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<button class="remove-file">Remove</button>\n\t\t';
		uploadedFiles.appendChild(item);
		var btn = item.querySelector('.remove-file');
		btn.addEventListener('click', function () {
			item.remove();
		});
	}
}

// Checklist generation (heuristic from filename or text)
function processFileForChecklist(file) {
	var ext = (file.name.split('.').pop() || '').toLowerCase();
	if (ext === 'txt') {
		var reader = new FileReader();
		reader.onload = function () {
			var text = String(reader.result || '');
			var items = extractChecklistItems(text);
			renderChecklist(items);
		};
		reader.readAsText(file);
		return;
	}

	if (ext === 'pdf' && window.pdfjsLib) {
		parsePdf(file).then(function (text) {
			var items = extractChecklistItems(text);
			renderChecklist(items);
		}).catch(function () {
			renderChecklist(generateHeuristicChecklist([file.name]));
		});
		return;
	}

	if ((ext === 'docx' || ext === 'doc') && window.mammoth) {
		parseDocx(file).then(function (text) {
			var items = extractChecklistItems(text);
			renderChecklist(items);
		}).catch(function () {
			renderChecklist(generateHeuristicChecklist([file.name]));
		});
		return;
	}

	if (ext === 'pptx' && window.JSZip) {
		parsePptx(file).then(function (text) {
			var items = extractChecklistItems(text);
			renderChecklist(items);
		}).catch(function () {
			renderChecklist(generateHeuristicChecklist([file.name]));
		});
		return;
	}

	// Fallback to heuristic when unsupported
	var tokens = file.name.replace(/\.[^.]+$/, '')
		.replace(/[_-]+/g, ' ')
		.split(/\s+/)
		.filter(function (t) { return t.length > 2; });
	var guessed = generateHeuristicChecklist(tokens);
	renderChecklist(guessed);
}

function inferCategory(text) {
	var s = text.toLowerCase();
	if (/privacy|gdpr|pii|data/.test(s)) return 'Privacy';
	if (/security|encryption|access|auth/.test(s)) return 'Security';
	if (/safety|risk|hazard|incident/.test(s)) return 'Safety';
	if (/quality|audit|review|evidence/.test(s)) return 'Quality';
	return 'General';
}

function generateHeuristicChecklist(tokens) {
	var base = [
		'Identify applicable regulations and scope',
		'Assign compliance ownership and roles',
		'Create evidence collection plan',
		'Define review cadence and audit trail',
		'Roll out training and awareness'
	];
	var items = base.map(function (t) { return { text: t, category: inferCategory(t) }; });
	(tokens || []).forEach(function (tk) {
		if (/gdpr|privacy|data/i.test(tk)) items.push({ text: 'Implement data subject rights process', category: 'Privacy' });
		if (/iso|27001|security/i.test(tk)) items.push({ text: 'Establish information security policy', category: 'Security' });
		if (/hipaa|health/i.test(tk)) items.push({ text: 'Protect PHI with safeguards', category: 'Privacy' });
		if (/sox|financial|audit/i.test(tk)) items.push({ text: 'Document financial controls (SOX)', category: 'Quality' });
		if (/safety|osha/i.test(tk)) items.push({ text: 'Perform workplace safety risk assessment', category: 'Safety' });
	});
	return dedupeItems(items);
}

// Text extraction helpers
function parsePdf(file) {
	return new Promise(function (resolve, reject) {
		var reader = new FileReader();
		reader.onload = function () {
			var typedarray = new Uint8Array(reader.result);
			window.pdfjsLib.getDocument({ data: typedarray }).promise
				.then(function (pdf) {
					var max = Math.min(pdf.numPages, 30);
					var promises = [];
					for (var i = 1; i <= max; i++) {
						promises.push(pdf.getPage(i).then(function (page) {
							return page.getTextContent().then(function (tc) {
								return tc.items.map(function (it) { return it.str; }).join(' ');
							});
						}));
					}
					Promise.all(promises).then(function (arr) {
						resolve(arr.join('\n'));
					}).catch(reject);
				}).catch(reject);
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}

function parseDocx(file) {
	return new Promise(function (resolve, reject) {
		var reader = new FileReader();
		reader.onload = function () {
			window.mammoth.extractRawText({ arrayBuffer: reader.result })
				.then(function (res) { resolve(String(res.value || '')); })
				.catch(reject);
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}

function parsePptx(file) {
	return new Promise(function (resolve, reject) {
		var reader = new FileReader();
		reader.onload = function () {
			window.JSZip.loadAsync(reader.result).then(function (zip) {
				var slideFiles = Object.keys(zip.files).filter(function (p) { return /ppt\/slides\/slide\d+\.xml$/.test(p); }).slice(0, 50);
				return Promise.all(slideFiles.map(function (p) { return zip.files[p].async('string'); }));
			}).then(function (slides) {
				var text = slides.map(function (xml) {
					return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
				}).join('\n');
				resolve(text);
			}).catch(reject);
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}

// NLP-ish extraction of checklist items from raw text
function extractChecklistItems(text) {
	var lines = String(text || '')
		.replace(/\r/g, '')
		.split(/\n|\u2022|\u25CF|\u25A0|\u25E6|\-/)
		.map(function (l) { return l.trim(); })
		.filter(function (l) { return l.length > 0; });

	var verbs = /(ensure|implement|establish|define|maintain|document|review|monitor|encrypt|control|limit|backup|train|assess|audit|report|validate|mask|anonymize|log|test|classify|retain|delete|restrict)/i;
	var keywords = /(gdpr|hipaa|sox|iso\s*27001|pci|privacy|security|safety|quality|risk|consent|pii|access|encryption|backup|incident|breach|policy|procedure|control|evidence)/i;

	var items = lines
		.map(function (l) { return l.replace(/^\d+\.|^[a-z]\)|^\(?\d+\)?\s*/i, '').trim(); })
		.filter(function (l) { return /\s/.test(l); })
		.filter(function (l) { return verbs.test(l) || keywords.test(l); })
		.map(function (l) { return simplifyItemText(l); })
		.filter(function (l) { return l.length > 0; })
		.map(function (l) { return { text: capitalize(l), category: inferCategory(l) }; });

	if (!items.length) {
		return generateHeuristicChecklist(lines.slice(0, 10));
	}

	return dedupeItems(items).slice(0, 12);
}

function capitalize(s) {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Simplify a raw sentence into a short imperative checklist item
function simplifyItemText(input) {
    var s = String(input || '');
    // Remove brackets and references
    s = s.replace(/\[[^\]]*\]|\([^\)]*\)/g, ' ');
    // Keep first clause up to period/semicolon/comma
    s = s.split(/[.;:]/)[0];
    // Normalize common starters
    s = s.replace(/\bmake sure to\b/gi, 'ensure ')
         .replace(/\bmake sure\b/gi, 'ensure ')
         .replace(/\bensure that\b/gi, 'ensure ')
         .replace(/\bestablish (an|a|the)\b/gi, 'establish ')
         .replace(/\bimplement (an|a|the)\b/gi, 'implement ')
         .replace(/\bdefine (an|a|the)\b/gi, 'define ')
         .replace(/\bcreate (an|a|the)\b/gi, 'create ')
         .replace(/\bmaintain (an|a|the)\b/gi, 'maintain ')
         .replace(/\bdocument (an|a|the)\b/gi, 'document ');
    // Remove leading articles
    s = s.replace(/^\s*(the|a|an)\s+/i, '');
    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
    // If too long, truncate sensibly at ~100 chars
    if (s.length > 100) {
        var cut = s.lastIndexOf(' ', 100);
        if (cut > 60) s = s.slice(0, cut);
    }
    // If it doesn't start with a verb, try to prepend a generic verb
    if (!/^(ensure|implement|establish|define|maintain|document|review|monitor|encrypt|control|limit|backup|train|assess|audit|report|validate|mask|anonymize|log|test|classify|retain|delete|restrict|create|apply|enforce)\b/i.test(s)) {
        // Turn noun phrases like "access controls" into "Implement access controls"
        s = 'Implement ' + s;
    }
    // Remove trailing punctuation
    s = s.replace(/[.,;:\-\s]+$/g, '').trim();
    return s;
}

function dedupeItems(items) {
	var seen = {};
	return items.filter(function (it) {
		var key = it.category + '::' + it.text;
		if (seen[key]) return false;
		seen[key] = true;
		return true;
	});
}

function renderChecklist(items) {
	var container = document.getElementById('checklistContainer');
	if (!container) return;
	if (!items || !items.length) {
		container.innerHTML = '<div class="no-checklist">\n\t\t<i class="fas fa-clipboard-list"></i>\n\t\t<h3>No Checklist Generated Yet</h3>\n\t\t<p>Upload a regulatory document to generate your compliance checklist</p>\n\t</div>';
		return;
	}
	var html = items.map(function (it, idx) {
		return '\n\t<div class="checklist-item">\n\t\t<input id="chk_' + idx + '" class="checklist-checkbox" type="checkbox" />\n\t\t<label class="checklist-text" for="chk_' + idx + '">' + escapeHtml(it.text) + '</label>\n\t\t<span class="checklist-category">' + escapeHtml(it.category) + '</span>\n\t</div>';
	}).join('');
	container.innerHTML = html;
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

// Export helpers
function getChecklistData() {
	var container = document.getElementById('checklistContainer');
	if (!container) return [];
	var nodes = container.querySelectorAll('.checklist-item');
	var items = [];
	nodes.forEach(function (node) {
		var text = (node.querySelector('.checklist-text') || {}).textContent || '';
		var cat = (node.querySelector('.checklist-category') || {}).textContent || 'General';
		var checked = (node.querySelector('.checklist-checkbox') || {}).checked || false;
		items.push({ text: text.trim(), category: cat.trim(), done: checked });
	});
	return items;
}

function exportChecklistToPDF() {
	var items = getChecklistData();
	if (!items.length) { showSuccess('Nothing to export', 'Generate a checklist first'); return; }
	var jsPDF = window.jspdf && window.jspdf.jsPDF;
	if (!jsPDF) { showSuccess('Export unavailable', 'PDF library failed to load'); return; }
	var doc = new jsPDF({ unit: 'pt', format: 'a4' });
	var x = 40, y = 60, lineHeight = 18, maxWidth = 515;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.text('Compliance Checklist', x, y);
	y += 24;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(11);
	items.forEach(function (it, i) {
		var prefix = it.done ? '[x]' : '[ ]';
		var line = prefix + ' ' + it.text + '  (' + it.category + ')';
		var lines = doc.splitTextToSize(line, maxWidth);
		lines.forEach(function (ln) {
			if (y > 780) { doc.addPage(); y = 60; }
			doc.text(ln, x, y);
			y += lineHeight;
		});
	});
	doc.save('compliance-checklist.pdf');
}

function exportChecklistToDOCX() {
	var items = getChecklistData();
	if (!items.length) { showSuccess('Nothing to export', 'Generate a checklist first'); return; }
	var docx = window.docx;
	if (!docx) { showSuccess('Export unavailable', 'Word library failed to load'); return; }
	var paragraphs = [];
	paragraphs.push(new docx.Paragraph({ children: [ new docx.TextRun({ text: 'Compliance Checklist', bold: true, size: 28 }) ] }));
	paragraphs.push(new docx.Paragraph({ text: '' }));
	items.forEach(function (it) {
		var checkbox = it.done ? '[x]' : '[ ]';
		paragraphs.push(new docx.Paragraph({ children: [
			new docx.TextRun({ text: checkbox + ' ', bold: true }),
			new docx.TextRun({ text: it.text + ' ' }),
			new docx.TextRun({ text: '(' + it.category + ')', italics: true, color: '666666' })
		]}));
	});
	var doc = new docx.Document({ sections: [{ properties: {}, children: paragraphs }] });
	docx.Packer.toBlob(doc).then(function (blob) {
		saveAsBlob(blob, 'compliance-checklist.docx');
	});
}

function saveAsBlob(blob, filename) {
	var url = URL.createObjectURL(blob);
	var a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	setTimeout(function(){
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 0);
}

