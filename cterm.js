// init common style tag
var __style = document.createElement('style');
__style.type = 'text/css';
document.getElementsByTagName('head')[0].appendChild(__style);

function cterm (element, font_size, bg_color, fg_color) {
	
	if (!element.id) return null; // element.id is required.
	
	// internal global variables
	var _this = this;
	var _term = element;
	var _mode = 2;
	var _focus_term = false;
	var _focus_input = false;
	var _selecting = false;
	var _scrollLock = true;
	var _curpos = 0;
	var _callback = function(value) {};
	var _timeout;
	
	/*
		clear()
		
		clear text in terminal.
	*/
	_this.clear = function() {
		if (!(_mode == 0 || _mode == 1)) {
			while (_term.firstChild != _lastLine) {
				var node = _term.removeChild(_term.firstChild);
				node = null;
			}
			while (_lastLine.firstChild != _buffer) {
				var node = _lastLine.removeChild(_lastLine.firstChild);
				node = null;
			}
		}
	}
	/*
		write(text, fg_color, bg_color)
		
		write text to terminal.
		
		text: text to write.
		fg_color: foreground color. (optional)
		bg_color: background color. (optional)
	*/
	_this.write = function(text, fg_color, bg_color) {
		fg_color = fg_color ? fg_color : _fg_color;
		bg_color = bg_color ? bg_color : _bg_color;
		lines = text.split('\n');
		classname = getColorClass(fg_color, bg_color);
		lines.forEach(function (line, index, array) {
			if (line != '') {
				var span = document.createElement('span');
				span.classList.add(classname);
				span.textContent = line;
				_lastLine.insertBefore(span, _buffer);
			}
			if (index != array.length - 1) {
				_lastLine.style.backgroundColor = bg_color;
				var newline = document.createElement('p');
				_term.appendChild(newline);
				var focus_input = _focus_input;
				newline.appendChild(_buffer);
				if (focus_input) {
					_input.focus();
				}
				_lastLine = newline;
				if (_scrollLock) {
					_term.scrollTop = _term.scrollHeight - _term.offsetHeight;
				}
			}
		})
	}
	/*
		read(cb, time, timecb, imeMode, password)
		
		read text from terminal.
		
		cb: callback function satisfy foo(text), being called when text is inputted.
		time: timeout in millisecond (optional)
		timecb: callback function satisfy foo(), being called when it timed out. (optional)
		imeMode: whether to allow IME.
		password: whether show typed characters.
	*/
	_this.read = function(cb, time, timecb, imeMode, password) {
		_input.type = imeMode === false ? 'password' : 'text'; // _input.style.imeMode = imeMode === false ? 'disabled' : 'auto';
		_callback = cb;
		_mode = password ? 1 : 0;
		if (time) {
			_timeout = window.setTimeout(timecb, time);
		}
	}
	/*
		read(cb, time, timecb)
		
		read key from terminal.
		
		cb: callback function satisfy foo(key), being called when key is pressed.
		time: timeout in millisecond (optional)
		timecb: callback function satisfy foo(), being called when it timed out. (optional)
	*/
	_this.readKey = function(cb, time, timecb) {
		_callback = cb;
		_mode = 4;
		if (time) {
			_timeout = window.setTimeout(timecb, time);
		}
	}
	/*
		focus()
		
		set focus to the terminal.
	*/
	_this.focus = function() { _input.focus(); }
	/*
		setMode(mode)
		
		set terminal mode.
	
		MODE	NAME		CURSOR	READBLOCK	SHOWBUFFER
		0		READING		FLASH	NO			YES
		1		PASSWORD	FLASH	NO			NO
		2		WRITING		FLASH	YES			NO
		3		HIDE		HIDE	YES			NO
		4		READKEY		FLASH	YES			NO
	*/
	_this.setMode = function(mode) {
		if ((_mode == 0 || _mode == 1) && (mode == 2 || mode == 3)) {
			var text = _input.value;
			_input.type = 'password'; // interrupt IME
			_input.value = '';
			refreshBuffer();
			_this.write(text);
		}
		_mode = mode;
		if (_mode == 2 || _mode == 3) {
			window.clearTimeout(_timeout);
			_callback = function(value) {};
		}
		refreshBuffer();
	}
	
	// apply default value for optional arguments
	_bg_color = bg_color ? bg_color : '#000';
	_fg_color = fg_color ? fg_color : '#fff';
	_font_size = font_size ? font_size : 16;
	
	__style.innerHTML +=
		'#' + _term.id + ' p{' +
		'min-height:' + _font_size + 'px;' +
		'font-size:' + _font_size + 'px;' +
		'margin: 0;' +
		'}';
	
	var _lastLine = _term.lastElementChild;
	if (!_lastLine) _lastLine = _term.appendChild(document.createElement('p'));
	
	var _buffer = document.createElement('span');
	var _lbuffer = document.createElement('span');
	var _ubuffer = document.createElement('span');
	var _rbuffer = document.createElement('span');
	var _inputer = document.createElement('span');
	var _placeholder = document.createElement('span');
	var _cursor = document.createElement('span');
	var _input = document.createElement('input');
	
	_term.setAttribute('tabindex', '0');
	_term.classList.add('cterm');
	_term.classList.add(getColorClass(_fg_color, _bg_color));
	_inputer.classList.add('inputer');
	_cursor.classList.add('cursor');
	_cursor.classList.add(getCursorClass(_fg_color, _bg_color));
	_ubuffer.classList.add('ubuffer');
	
	_placeholder.textContent = ' ';
	_input.type = 'password';
	
	_cursor.appendChild(_ubuffer);
	_inputer.appendChild(_placeholder);
	_inputer.appendChild(_cursor);
	_inputer.appendChild(_input);
	_buffer.appendChild(_lbuffer);
	_buffer.appendChild(_inputer);
	_buffer.appendChild(_rbuffer);
	_lastLine.appendChild(_buffer);
	
	window.setInterval(function () {
		if (_mode == 3) { // hide
			_cursor.classList.remove('blur');
			_cursor.classList.add('hide');
		} else if (!(_focus_term || _focus_input)) { // blur
			_cursor.classList.add('blur');
		} else { // flash
			_cursor.classList.remove('blur');
			_cursor.classList.toggle('hide');
		}
	}, 533);
	
	_term.addEventListener('click', function() { 
		if (!_selecting || window.getSelection().type != 'Range') {
			_input.focus();
		}
		_selecting = false;
	});
	_term.addEventListener('keydown', function() { if (!_focus_input) _input.focus(); });
	_term.addEventListener('selectstart', function() { _selecting = true; });
	_term.addEventListener('focus', function() { _focus_term = true; });
	_term.addEventListener('blur', function() { _focus_term = false; });
	_term.addEventListener('scroll', function(event) { 
		_scrollLock = (_term.scrollTop + _term.offsetHeight) == _term.scrollHeight;
		if (!_scrollLock) _term.focus();
	});
	_input.addEventListener('focus', function() { _focus_input = true; });
	_input.addEventListener('blur', function(e) { _focus_input = false; });
	_input.addEventListener('keyup', function(event) {
		if (event.keyCode == 13 && (_mode == 0 || _mode == 1)) { //enter
			window.clearTimeout(_timeout);
			var text = _input.value;
			var callback = _callback;
			_input.value = '';
			_callback = function(value) {};
			if (_mode == 0) _this.write(text);
			_mode = 2;
			_this.write('\n');
			callback(text);
		}
		refreshBuffer()
	});
	_input.addEventListener('keypress', function(event) {
		if (_mode == 4) {
			window.clearTimeout(_timeout);
			var callback = _callback;
			_mode = 2;
			_callback = function(value) {};
			callback(event.charCode);
			return false;
		}
	});
	_input.addEventListener('input', refreshBuffer);
	function refreshBuffer() {
		_curpos = _input.selectionStart;
		var text = _input.value;
		var under = text.substr(_curpos, 1);
		if (_mode == 0) {
			var left = text.substr(0, _curpos);
			var right = text.substr(_curpos + 1);
			_lbuffer.textContent = left;
			_ubuffer.textContent = under;
			_rbuffer.textContent = right;
		} else {
			_lbuffer.textContent = '';
			_ubuffer.textContent = '';
			_rbuffer.textContent = '';
		}
		if (under == '') {
			_placeholder.textContent = ' ';
		} else {
			_placeholder.textContent = under;
		}
		
	}
	_input.addEventListener('select', function() {
		if (_input.selectionStart != _curpos && _input.selectionEnd != _curpos) {
			_input.selectionStart = _curpos;
			_input.selectionEnd = _curpos;
		} else if (_input.selectionStart != _curpos) {
			_input.selectionEnd = _input.selectionStart;
			_curpos = _input.selectionEnd;
		} else if (_input.selectionEnd != _curpos) {
			_input.selectionStart = _input.selectionEnd;
			_curpos = _input.selectionStart;
		}
	});
	
	function classFilter(origin) {
		var allow = '0123456789abcdef';
		var ret = '';
		for (var i = 0; i < origin.length; ++i) {
			if (origin[i] != ' ') {
				if (allow.indexOf(origin[i]) != -1) {
					ret += origin[i];
				} else {
					ret += '_';
				}
			}
		}
		return ret;
	}
	
	function getColorClass(fg_color, bg_color) {
		var classname = 'fg' + classFilter(fg_color) + 'bg' + classFilter(bg_color);
		if (__style.innerHTML.indexOf('.cterm .' + classname) == -1) {
			__style.innerHTML += 
				'.cterm .' + classname + ',.cterm.' + classname + '{' +
				'color:' + fg_color + ';' +
				'background-color:' + bg_color + ';' +
				'}' +
				'.cterm .' + classname + '::selection' + ',.cterm.' + classname + '::selection{' +
				'color:' + bg_color + ';' +
				'background-color:' + fg_color + ';' +
				'}';
		}
		return classname
	}
	
	function getCursorClass(fg_color, bg_color) {
		var classname = 'cursor' + classFilter(fg_color);
		if (__style.innerHTML.indexOf('.cterm .' + classname) == -1) {
			__style.innerHTML += 
				'.cterm .' + classname + '{background-color:' + fg_color + ';}' +
				'.cterm .' + classname + '.hide{background-color:' + bg_color + ';}' +
				'.cterm .' + classname + '.blur{background-color:' + bg_color + ';border:1px solid ' + fg_color + ';}';
		}
		return classname;
	}
}