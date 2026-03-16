/**
 * SCORM 1.2 API Wrapper
 * Hilscher-Clarke Electric — Learning & Development
 *
 * Tracks:
 *   cmi.core.lesson_status       (not attempted / incomplete / passed / failed)
 *   cmi.core.score.raw           (0–100)
 *   cmi.core.score.min/max       (0 / 100)
 *   cmi.core.session_time        (HH:MM:SS)
 *   cmi.core.lesson_location     (current screen index)
 *   cmi.suspend_data             (JSON: screen, quiz answers, progress)
 *   cmi.interactions             (each quiz answer recorded per SCORM 1.2)
 */

var SCORM = (function () {

  var _api         = null;
  var _initialized = false;
  var _finished    = false;
  var _startTime   = null;
  var _lastError   = "0";

  var _data = {
    "cmi.core.lesson_status"   : "incomplete",
    "cmi.core.score.raw"       : "",
    "cmi.core.score.min"       : "0",
    "cmi.core.score.max"       : "100",
    "cmi.core.session_time"    : "00:00:00",
    "cmi.suspend_data"         : "",
    "cmi.core.lesson_location" : "0",
    "cmi.core.student_name"    : "",
    "cmi.core.student_id"      : "",
    "cmi.core.exit"            : ""
  };

  function _findAPI(win) {
    var tries = 0;
    while (win.API == null && win.parent && win.parent !== win) {
      if (++tries > 500) return null;
      win = win.parent;
    }
    return win.API || null;
  }

  function _getAPI() {
    var api = _findAPI(window);
    if (!api && window.opener) api = _findAPI(window.opener);
    return api;
  }

  function _elapsed() {
    if (!_startTime) return "00:00:00";
    var s = Math.floor((new Date() - _startTime) / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h<10?"0":"")+h+":"+(m<10?"0":"")+m+":"+(sec<10?"0":"")+sec;
  }

  function initialize() {
    if (_initialized) return true;
    _api = _getAPI();
    _startTime = new Date();
    if (!_api) {
      console.warn("SCORM 1.2: No LMS API found — standalone mode.");
      _initialized = true;
      _tryRestoreLocal();
      return false;
    }
    var ok = _api.LMSInitialize("");
    if (ok === "true" || ok === true) {
      _initialized = true;
      _data["cmi.core.student_name"]    = _api.LMSGetValue("cmi.core.student_name") || "";
      _data["cmi.core.student_id"]      = _api.LMSGetValue("cmi.core.student_id")   || "";
      _data["cmi.core.lesson_status"]   = _api.LMSGetValue("cmi.core.lesson_status") || "not attempted";
      _data["cmi.suspend_data"]         = _api.LMSGetValue("cmi.suspend_data")        || "";
      _data["cmi.core.lesson_location"] = _api.LMSGetValue("cmi.core.lesson_location") || "0";
      console.log("SCORM 1.2 HC: Initialized. Student:", _data["cmi.core.student_name"]);
      return true;
    }
    _lastError = _api.LMSGetLastError();
    console.error("SCORM 1.2 HC: LMSInitialize failed. Error:", _lastError);
    return false;
  }

  function finish() {
    if (!_initialized || _finished) return true;
    _finished = true;
    _data["cmi.core.session_time"] = _elapsed();
    if (!_api) { _trySaveLocal(); return true; }
    _api.LMSSetValue("cmi.core.lesson_status",   _data["cmi.core.lesson_status"]);
    if (_data["cmi.core.score.raw"] !== "") {
      _api.LMSSetValue("cmi.core.score.raw", _data["cmi.core.score.raw"]);
      _api.LMSSetValue("cmi.core.score.min", "0");
      _api.LMSSetValue("cmi.core.score.max", "100");
    }
    _api.LMSSetValue("cmi.core.session_time",    _data["cmi.core.session_time"]);
    _api.LMSSetValue("cmi.suspend_data",          _data["cmi.suspend_data"]);
    _api.LMSSetValue("cmi.core.lesson_location",  _data["cmi.core.lesson_location"]);
    _api.LMSSetValue("cmi.core.exit",             _data["cmi.core.exit"]);
    _api.LMSCommit("");
    var result = _api.LMSFinish("");
    _trySaveLocal();
    return (result === "true" || result === true);
  }

  function getValue(key) {
    return (_api && _initialized) ? _api.LMSGetValue(key) : (_data[key] || "");
  }

  function setValue(key, value) {
    _data[key] = String(value);
    if (_api && _initialized && !_finished) {
      _api.LMSSetValue(key, String(value));
    }
  }

  function commit() {
    if (_api && _initialized && !_finished) _api.LMSCommit("");
    _trySaveLocal();
  }

  function setStatus(status) {
    var valid = ["not attempted","incomplete","completed","passed","failed","browsed"];
    setValue("cmi.core.lesson_status", valid.indexOf(status) > -1 ? status : "incomplete");
  }

  function setScore(raw, mastery) {
    mastery = (mastery !== undefined) ? mastery : 75;
    raw = Math.round(Math.max(0, Math.min(100, raw)));
    _data["cmi.core.score.raw"] = String(raw);
    _data["cmi.core.score.min"] = "0";
    _data["cmi.core.score.max"] = "100";
    var status = (raw >= mastery) ? "passed" : "failed";
    _data["cmi.core.lesson_status"] = status;
    if (_api && _initialized && !_finished) {
      _api.LMSSetValue("cmi.core.score.raw",     String(raw));
      _api.LMSSetValue("cmi.core.score.min",     "0");
      _api.LMSSetValue("cmi.core.score.max",     "100");
      _api.LMSSetValue("cmi.core.lesson_status", status);
      _api.LMSCommit("");
    }
  }

  var _interactionCount = 0;

  function recordInteraction(id, response, result, weight) {
    if (!_api || !_initialized) return;
    var n = _interactionCount;
    try {
      _api.LMSSetValue("cmi.interactions." + n + ".id",              String(id));
      _api.LMSSetValue("cmi.interactions." + n + ".type",            "choice");
      _api.LMSSetValue("cmi.interactions." + n + ".student_response", String(response));
      _api.LMSSetValue("cmi.interactions." + n + ".result",          String(result));
      _api.LMSSetValue("cmi.interactions." + n + ".weighting",       String(weight !== undefined ? weight : 1));
      _api.LMSSetValue("cmi.interactions." + n + ".time",            _currentTime());
      _interactionCount++;
    } catch(e) {
      console.warn("SCORM 1.2 HC: interaction recording failed:", e);
    }
  }

  function _currentTime() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    return (h<10?"0":"")+h+":"+(m<10?"0":"")+m+":"+(s<10?"0":"")+s;
  }

  function saveProgress(obj) {
    try {
      var json = JSON.stringify(obj);
      if (json.length > 4000) {
        var slim = { screen: obj.screen, completed: obj.completed, score: obj.score };
        json = JSON.stringify(slim);
      }
      setValue("cmi.suspend_data", json);
      setValue("cmi.core.lesson_location", String(obj.screen || 0));
      commit();
    } catch(e) {
      console.error("SCORM 1.2 HC: saveProgress error:", e);
    }
  }

  function loadProgress() {
    var raw = getValue("cmi.suspend_data");
    if (!raw) return _tryRestoreLocal();
    try { return JSON.parse(raw); } catch(e) { return null; }
  }

  var LS_KEY = "scorm_hc_onboarding_sample";

  function _trySaveLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        lesson_status:   _data["cmi.core.lesson_status"],
        score:           _data["cmi.core.score.raw"],
        lesson_location: _data["cmi.core.lesson_location"],
        suspend_data:    _data["cmi.suspend_data"],
        saved_at:        new Date().toISOString()
      }));
    } catch(e) {}
  }

  function _tryRestoreLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var b = JSON.parse(raw);
      if (b.lesson_status)   _data["cmi.core.lesson_status"]   = b.lesson_status;
      if (b.score)           _data["cmi.core.score.raw"]        = b.score;
      if (b.lesson_location) _data["cmi.core.lesson_location"]  = b.lesson_location;
      if (b.suspend_data)    _data["cmi.suspend_data"]          = b.suspend_data;
      if (b.suspend_data) { try { return JSON.parse(b.suspend_data); } catch(e) {} }
      return null;
    } catch(e) { return null; }
  }

  return {
    initialize:        initialize,
    finish:            finish,
    getValue:          getValue,
    setValue:          setValue,
    commit:            commit,
    setStatus:         setStatus,
    setScore:          setScore,
    saveProgress:      saveProgress,
    loadProgress:      loadProgress,
    recordInteraction: recordInteraction,
    getStudentName:    function() { return _data["cmi.core.student_name"]; },
    getStudentId:      function() { return _data["cmi.core.student_id"]; },
    _isFinished:       function() { return _finished; }
  };

})();
