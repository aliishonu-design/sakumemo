// ─── サクメモ 作業カードの表示ルール（アプリ・みんなのサクメモ共通）───
// 入力した順番に関係なく、作業は下の順番、同じ作業の資材は名前順で表示します。
// ※ このファイルと App.jsx 内の同名関数は同じ内容です（片方を変えたらもう片方も変える）
var SK_WORKS = [
  // [値, ラベル, アイコン, 背景色, 文字色]
  ["sow",        "播種",         "🌰", "#dcfce7", "#166534"],
  ["germinated", "発芽確認",     "🌱", "#dcfce7", "#166534"],
  ["transplant", "定植",         "🪴", "#ede9fe", "#5b21b6"],
  ["water",      "水やり",       "💧", "#e0f2fe", "#075985"],
  ["fert",       "施肥",         "🌿", "#d1fae5", "#065f46"],
  ["pest",       "防除",         "🐛", "#fef3c7", "#92400e"],
  ["hormone",    "ホルモン処理", "🧪", "#fae8ff", "#86198f"],
  ["pruning",    "剪定",         "✂️", "#f3f4f6", "#374151"],
  ["thinning",   "摘果・摘花",   "🌸", "#fce7f3", "#831843"],
  ["sideshot",   "脇芽かき",     "🌱", "#f3f4f6", "#374151"],
  ["repot",      "植え替え",     "🪣", "#ede9fe", "#5b21b6"],
  ["event",      "生育記録",     "📋", "#fce7f3", "#831843"],
  ["harvest",    "収穫",         "🧺", "#dbeafe", "#1e40af"],
  ["discard",    "廃棄・株調整", "♻️", "#f3f4f6", "#374151"],
  ["equip",      "資材作業",     "🏗️", "#f3f4f6", "#374151"],
  ["check",      "見回り",       "👀", "#f3f4f6", "#374151"],
  ["other",      "その他",       "✏️", "#f3f4f6", "#374151"],
  ["end",        "栽培終了",     "🏁", "#dbeafe", "#1e40af"]
];
function skEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
function skVal(l, a, b) { var x = l[a]; if (x == null || x === "") x = l[b]; return x == null ? "" : String(x); }
function skMD(d) { if (!d) return ""; var p = String(d).slice(0, 10).split("-"); return p.length === 3 ? (+p[1]) + "/" + (+p[2]) : String(d); }
function skWorkIndex(w) { for (var i = 0; i < SK_WORKS.length; i++) if (SK_WORKS[i][0] === w) return i; return 99; }
function skWorkInfo(w) {
  var i = skWorkIndex(w);
  var r = i < 99 ? SK_WORKS[i] : [w, w || "その他", "✏️", "#f3f4f6", "#374151"];
  return { value: r[0], label: r[1], icon: r[2], bg: r[3], fg: r[4] };
}
// カードに付ける作業タグ（重複なし・決まった順番）
function skCardWorks(logs) {
  var seen = {}, out = [];
  (logs || []).forEach(function (l) { var w = l.work || "other"; if (!seen[w]) { seen[w] = 1; out.push(w); } });
  out.sort(function (a, b) { return skWorkIndex(a) - skWorkIndex(b); });
  return out;
}
// カードの詳細行（作業の順番 → 同じ作業は名前順。アプリの項目名・DBの列名どちらでも可）
function skCardLines(logs) {
  var lines = [], seen = {};
  function add(w, name, text, color) {
    var t = skWorkInfo(w).icon + " " + text;
    if (seen[t]) return; seen[t] = 1;
    lines.push({ rank: skWorkIndex(w), name: name || "", text: t, color: color });
  }
  (logs || []).forEach(function (l) {
    var sq = skVal(l, "sowQty", "sow_qty");
    if (sq) add("sow", "", "播種 " + sq + "粒", "#5a5040");
    var gc = skVal(l, "germinationCnt", "germination_cnt"), gd = skVal(l, "germinationDate", "germ_date");
    if (gc) add("germinated", "", "発芽 " + gc + "粒" + (gd ? "（" + skMD(gd) + "）" : ""), "#065f46");
    var tq = skVal(l, "transplantQty", "transplant_qty");
    if (tq) add("transplant", "", "定植 " + tq + "株", "#5a5040");
    var fn = skVal(l, "fertName", "fert_name");
    if (fn) {
      var fd = skVal(l, "fertDil", "fert_dil"), fs = skVal(l, "fertSprayAmt", "fert_spray_amt"), fsu = skVal(l, "fertSprayUnit", "fert_spray_unit") || "L";
      var fa = skVal(l, "fertAmt", "fert_amt"), fu = skVal(l, "fertUnit", "fert_unit"), fm = skVal(l, "fertMethod", "fert_method");
      add("fert", fn, fn + (fd && fs ? " " + fd + "倍希釈 散布" + fs + fsu : (fa ? " " + fa + fu : "")) + (fm ? "（" + fm + "）" : ""), "#065f46");
    }
    var pn = skVal(l, "pestName", "pest_name");
    if (pn) {
      var pd = skVal(l, "pestDil", "pest_dil"), pa = skVal(l, "pestAmt", "pest_amt"), pu = skVal(l, "pestUnit", "pest_unit");
      var pt = skVal(l, "pestTarget", "pest_tgt");
      var hz = l.work === "hormone"; add(hz ? "hormone" : "pest", pn, pn + (pd ? " " + pd + "倍" : "") + (pa ? (hz ? " 使用" : " 散布") + pa + pu : "") + (pt ? (hz ? " 目的:" : " 対象:") + pt : ""), hz ? "#86198f" : "#92400e");
    }
    if (l.work === "repot") {
      var rs = skVal(l, "repotSize", "repot_size"), rv = skVal(l, "repotVol", "repot_vol");
      if (rs || rv) add("repot", "", [rs ? rs + "号鉢" : "", rv ? rv + "L" : ""].filter(Boolean).join(" "), "#5a5040");
    }
    var et = skVal(l, "eventType", "event_type"), en = skVal(l, "eventNote", "event_note");
    if (et) add("event", "", et + (en ? " · " + en : ""), "#5a5040");
    var hg = skVal(l, "hvGradeStr", "hv_grade_str"), hk = skVal(l, "hvKg", "hv_kg"), hc = skVal(l, "hvCnt", "hv_cnt");
    if (hg || hk || hc) add("harvest", "", hg || [hk ? hk + "kg" : "", hc ? hc + "個" : ""].filter(Boolean).join(" "), "#059669");
    var ac = skVal(l, "addCnt", "add_cnt"), dc = skVal(l, "discardCnt", "discard_cnt");
    if (ac || dc) add("discard", "", "株数調整" + (ac ? " +" + ac + "株" : "") + (dc ? " -" + dc + "株（廃棄）" : ""), "#5a5040");
    var ea = skVal(l, "equipAct", "equip_act");
    if (ea) {
      var eu = skVal(l, "equipUseAmt", "equip_use_amt"), euu = skVal(l, "equipUseUnit", "equip_use_unit");
      add("equip", ea, ea + (eu ? " " + eu + euu : ""), "#5b21b6");
    }
    var on = skVal(l, "otherNote", "other_note");
    if (on && on.trim()) add("other", "", on.trim(), "#5a5040");
  });
  lines.sort(function (a, b) { return (a.rank - b.rank) || a.name.localeCompare(b.name, "ja"); });
  return lines;
}
// カードの補足（時刻・作業時間）
function skCardMeta(logs) {
  var l0 = (logs || [])[0] || {};
  var t = skVal(l0, "time", "time"), du = parseInt(skVal(l0, "duration", "duration")) || 0;
  var dstr = du > 0 ? (du >= 60 ? Math.floor(du / 60) + "時間" + (du % 60 ? (du % 60) + "分" : "") : du + "分") : "";
  return { time: t ? t.slice(0, 5) : "", duration: dstr };
}
