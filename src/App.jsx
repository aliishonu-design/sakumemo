import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://nlamtphkwdoxtjktkjzo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYW10cGhrd2RveHRqa3RranpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODI3NzYsImV4cCI6MjA5MzM1ODc3Nn0.8gba30xxu0s132vg_xOA6-Y3XWjR1YhaprIgUYHZO0o"
);

// DB helpers
const dbFetch = async (table, uid) => {
  // Supabaseデフォルト1000件制限を回避するためページネーションで全件取得
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while(true) {
    const { data, error } = await sb.from(table).select("*").eq("user_id", uid).order("created_at").range(from, from + PAGE - 1);
    if (error) {
      console.error("DB fetch error:", table, error.code, error.message);
      break;
    }
    const rows = data || [];
    all = [...all, ...rows];
    if(rows.length < PAGE) break; // 最後のページ
    from += PAGE;
  }
  return all;
};
const dbUpsert = async (table, row) => {
  let r = { ...row };
  // DBに存在しない列があると保存全体が失敗するため、その列だけ外して再試行（最大5回）
  for (let i = 0; i < 6; i++) {
    const { error } = await sb.from(table).upsert(r, { onConflict: "id" });
    if (!error) return true;
    const m = error.code === "PGRST204" && /'([^']+)' column/.exec(error.message || "");
    if (m && m[1] in r) { console.warn("DB列なしのため除外して再保存:", table, m[1]); delete r[m[1]]; continue; }
    console.error("DB保存エラー:", table, error.code, error.message, JSON.stringify(error));
    return false;
  }
  return false;
};
const dbDelete = async (table, id) => {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error("delete", table, error.message);
};

// Converters
const safeJson = (v, fb) => { if(v==null||v==='') return fb; if(typeof v!=='string') return v; try{ return JSON.parse(v); }catch{ return fb; } };
const fieldToDb   = (o, uid) => ({ id:o.id, user_id:uid, name:o.name||"", area:o.area||null, soil:o.soil||null, addr:o.addr||null, memo:o.memo||null, prefecture:o.prefecture||null });
const fieldFromDb = r => ({ id:r.id, name:r.name||"", area:r.area||"", soil:r.soil||"", addr:r.addr||"", memo:r.memo||"", prefecture:r.prefecture||"" });
const cropToDb    = (o, uid) => ({ id:o.id, user_id:uid, field_id:o.fieldId||null, type:o.type||null, variety:o.variety||null, germ_rate:o.germRate||null, stocks:o.stocks||null, ridge_w:o.ridgeW||null, ridge_h:o.ridgeH||null, rows:o.rows||null, row_space:o.rowSpace||null, plant_space:o.plantSpace||null, sow_date:o.sowDate||null, plant_date:o.plantDate||null, memo:o.memo||null, cultivation_type:o.cultivationType||null, seed_cost:o.seedCost||null, seed_note:o.seedNote||null, custom_name:o.customName||null, ended:o.ended||false, end_date:o.endDate||null, maturity:o.maturity||null, custom_days:o.customDays||null, custom_water:o.customWater||null, pot_size:o.potSize||null, pot_volume:o.potVolume||null, pot_count:o.potCount||null, grow_env:o.growEnv||null, agri_month_start:o.agriMonthStart||null, ridge_len:o.ridgeLen||null, cultivation_area:o.cultivationArea||null, temp_min:o.tempMin||null, temp_max:o.tempMax||null, fert_skip_date:o.fertSkipDate||null, fert_interval:o.fertInterval||null, reminder_mode:o.reminderMode||null, custom_events:o.customEvents?JSON.stringify(o.customEvents):null, harvest_days:o.harvestDays?parseInt(o.harvestDays):null, is_public:!!o.isPublic });
const cropFromDb  = (r, fields) => { const fi = fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, type:r.type||"", variety:r.variety||"", germRate:r.germ_rate||"", stocks:r.stocks||"", ridgeW:r.ridge_w||"", ridgeH:r.ridge_h||"", rows:r.rows||"", rowSpace:r.row_space||"", plantSpace:r.plant_space||"", sowDate:r.sow_date||"", plantDate:r.plant_date||"", memo:r.memo||"", cultivationType:r.cultivation_type||"transplant", seedCost:r.seed_cost||"", seedNote:r.seed_note||"", customName:r.custom_name||"", ended:r.ended||false, endDate:r.end_date||"", maturity:r.maturity||"mid", customDays:r.custom_days||"", customWater:r.custom_water||"", potSize:r.pot_size||"", potVolume:r.pot_volume||"", potCount:r.pot_count||"", growEnv:r.grow_env||"field", agriMonthStart:r.agri_month_start||"", ridgeLen:r.ridge_len||"", cultivationArea:r.cultivation_area||"", tempMin:r.temp_min||"", tempMax:r.temp_max||"", fertSkipDate:r.fert_skip_date||"", fertInterval:r.fert_interval||"", reminderMode:r.reminder_mode||"auto", customEvents:safeJson(r.custom_events,[]), harvestDays:r.harvest_days||null, isPublic:!!r.is_public }; };
const logToDb     = (o, uid, fields) => ({ id:o.id, user_id:uid, field_id:fields[o.fieldIdx]?.id||o.fieldId||null, crop_id:o.cropId||null, work:o.work||null, memo:o.memo||null, date:o.date||null, time:o.time||null, duration:o.duration||null, img_src:o.imgSrc||null, img2_src:o.imgSrc2||null, img3_src:o.imgSrc3||null, fert_name:o.fertName||null, fert_amt:o.fertAmt||null, fert_unit:o.fertUnit||null, fert_method:o.fertMethod||null, fert_cost:o.fertCost||null, fert_dil:o.fertDil||null, fert_spray_amt:o.fertSprayAmt||null, fert_spray_unit:o.fertSprayUnit||null, pest_name:o.pestName||null, pest_spray_amt:o.pestSprayAmt||null, pest_dil:o.pestDil||null, pest_amt:o.pestAmt||null, pest_unit:o.pestUnit||null, pest_tgt:o.pestTarget||null, pest_cost:o.pestCost||null, hv_kg:o.hvKg||null, hv_cnt:o.hvCnt||null, hv_q:o.hvQ||null, hv_price:o.hvPrice||null, equip_ids:o.equipIds||null, equip_act:o.equipAct||null, equip_use_amt:o.equipUseAmt||null, equip_use_unit:o.equipUseUnit||null, sow_qty:o.sowQty||null, germination_cnt:o.germinationCnt||null, germ_date:o.germinationDate||null, transplant_qty:o.transplantQty||null, discard_cnt:o.discardCnt||null, add_cnt:o.addCnt||null, event_type:o.eventType||null, event_note:o.eventNote||null, hv_grade_str:o.hvGradeStr||null, other_note:o.otherNote||null, repot_size:o.repotSize||null, repot_vol:o.repotVol||null, group_id:o._groupId||null, weather:o.weather||null });
const logFromDb   = (r, fields) => { const fi=fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, cropId:r.crop_id||"", work:r.work||"", memo:r.memo||"", date:r.date||"", time:r.time||"", duration:r.duration||"", imgSrc:r.img_src||null, imgSrc2:r.img2_src||null, imgSrc3:r.img3_src||null, aiReply:"", fertName:r.fert_name||"", fertAmt:r.fert_amt||"", fertUnit:r.fert_unit||"", fertMethod:r.fert_method||"", fertCost:r.fert_cost||"", fertDil:r.fert_dil||"", fertSprayAmt:r.fert_spray_amt||"", fertSprayUnit:r.fert_spray_unit||"L", pestName:r.pest_name||"", pestSprayAmt:r.pest_spray_amt||"", pestDil:r.pest_dil||"", pestAmt:r.pest_amt||"", pestUnit:r.pest_unit||"", pestTarget:r.pest_tgt||r.pest_target||"", pestCost:r.pest_cost||"", hvKg:r.hv_kg!=null?String(r.hv_kg):"", hvCnt:r.hv_cnt!=null?String(r.hv_cnt):"", hvQ:r.hv_q||"", hvPrice:r.hv_price||"", hvImgSrc:r.hv_img_src||null, equipIds:Array.isArray(r.equip_ids)?r.equip_ids:safeJson(r.equip_ids,[]), equipAct:r.equip_act||"", hvGradeStr:r.hv_grade_str||"", otherNote:r.other_note||"", repotSize:r.repot_size||"", repotVol:r.repot_vol||"", _groupId:r.group_id||null, weather:r.weather||"", equipUseAmt:r.equip_use_amt||null, equipUseUnit:r.equip_use_unit||null, sowQty:r.sow_qty||"", germinationCnt:r.germination_cnt||"", germinationDate:r.germ_date||r.germination_date||"", transplantQty:r.transplant_qty||"", discardCnt:r.discard_cnt||"", addCnt:r.add_cnt||"", eventType:r.event_type||"", eventNote:r.event_note||"" }; };
const fertMToDb   = (o, uid) => ({ id:o.id||uid0(), user_id:uid, name:o.name||null, type:o.type||null, price:o.price||null, punit:o.punit||null, capacity:o.capacity||null, cunit:o.cunit||null, npk:o.npk||null, stock:o.stock||null, sunit:o.sunit||null, dil:o.dil||null, note:o.note||null, status:o.status||null });
const fertMFromDb = r => alignStockUnit({ id:r.id, name:r.name||"", type:r.type||"", price:r.price||"", punit:r.punit||"", capacity:r.capacity||"", cunit:r.cunit||"", npk:r.npk||"", stock:r.stock||"", sunit:r.sunit||"", dil:r.dil||"", note:r.note||"", status:r.status||"使用中" });
const pestMToDb   = (o, uid) => ({ id:o.id||uid0(), user_id:uid, name:o.name||null, type:o.type||null, target:o.target||null, capacity:o.capacity||null, sunit:o.cunit||o.sunit||null, stock:(o.stock===0||o.stock)?String(o.stock):null, dil:o.dil||null, form_type:o.formType||null, price:o.price||null, note:o.note||null, status:o.status||null });
const pestMFromDb = r => ({ id:r.id, name:r.name||"", type:r.type||"", target:r.target||"", capacity:r.capacity||"", cunit:r.sunit||"ml", sunit:r.sunit||"ml", stock:r.stock!=null?String(r.stock):"", dil:r.dil||"", formType:r.form_type||"", price:r.price||"", note:r.note||"", status:r.status||"使用中" });
const equipToDb   = (o, uid) => ({ id:o.id||uid0(), user_id:uid, name:o.name||null, cat:o.cat||null, status:o.status||null, price:o.price||null, date:o.date||null, note:o.note||null, dep_years:o.depYears||null, stock:(o.stock===0||o.stock)?String(o.stock):null, capacity:o.capacity||null, cunit:o.cunit||null, sunit:o.sunit||null });
const equipFromDb = r => alignStockUnit({ id:r.id, name:r.name||"", cat:r.cat||"", status:r.status||"", price:r.price||"", date:r.date||"", note:r.note||"", depYears:r.dep_years||"", stock:r.stock!=null?String(r.stock):"", capacity:r.capacity||"", cunit:r.cunit||"", sunit:r.sunit||"" });
const costToDb    = (o, uid, fields) => ({ id:o.id, user_id:uid, field_id:(fields&&o.fieldIdx!==undefined&&o.fieldIdx!=="")?fields[o.fieldIdx]?.id||o.fieldId||null:o.fieldId||null, crop_id:o.cropId||null, cat:o.cat||null, name:o.name||null, amt:o.amt||null, date:o.date||null, qty:o.qty||null, qunit:o.qunit||null, note:o.note||null, master_id:o.masterId||null, work:o.work||null, pay_method:o.payMethod||null, pay_date:o.payDate||null, cancelled:o.cancelled||null, is_receivable:!!o.isReceivable, receivable_date:o.receivableDate||null, capacity:o.capacity||null, cunit:o.cunit||null, apportion_rate:(o.apportionRate!=null&&o.apportionRate!==""&&Number(o.apportionRate)<100)?Number(o.apportionRate):null, work_log_id:o.logId||null, stock_qty:o.stockQty||null });
const costFromDb  = (r, fields) => { const fi=fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, cropId:r.crop_id||"", cat:r.cat||"", name:r.name||"", amt:r.amt||"", date:r.date||"", qty:r.qty||"1", qunit:r.qunit||"個", note:r.note||"", masterId:r.master_id||null, work:r.work||"", logId:r.work_log_id||null, capacity:r.capacity||"", cunit:r.cunit||"", stockQty:r.stock_qty!=null?String(r.stock_qty):"", apportionRate:(r.apportion_rate!=null&&Number(r.apportion_rate)<100)?Number(r.apportion_rate):undefined, payMethod:r.pay_method||"現金", payDate:r.pay_date||"", cancelled:r.cancelled||false, isReceivable:!!r.is_receivable, receivableDate:r.receivable_date||"" }; };
const plotToDb    = (o, uid) => ({ id:o.id, user_id:uid, field_id:o.fieldId||null, name:o.name||null, cols:o.cols||20, rows:o.rows||20, cells:o.cells||[], season:o.season||null, cell_size:o.cellSize||30, bg_plot_id:o.bgPlotId||null, plant_date:o.plantDate||null, end_date:o.endDate||null, kind:o.kind||null, beds:o.beds||null, plantings:o.plantings||null });
const plotFromDb  = r => ({ id:r.id, fieldId:r.field_id||"", name:r.name||"", cols:r.cols||20, rows:r.rows||20, cells:Array.isArray(r.cells)?r.cells:safeJson(r.cells,[]), season:r.season||"", cellSize:r.cell_size||30, bgPlotId:r.bg_plot_id||"", plantDate:r.plant_date||"", endDate:r.end_date||"", kind:r.kind||"", beds:Array.isArray(r.beds)?r.beds:safeJson(r.beds,[]), plantings:Array.isArray(r.plantings)?r.plantings:safeJson(r.plantings,[]) });

// ============================================================
// CONSTANTS
// ============================================================
const CDB = {
  // ─── イネ科 ───
  rice:         { n:"水稲",       e:"🌾", d:150, w:2, cat:"イネ科",   hs:"穂が黄金色になり、籾が硬くなったら",          events:["穂ばらみ","出穂","収穫"], maturity:{early:130,mid:150,late:170} },
  wheat:        { n:"麦",         e:"🌾", d:240, w:5, cat:"イネ科",   hs:"穂が黄色くなり茎が枯れてきたら",              events:["出穂","収穫"], maturity:{early:210,mid:240,late:270} },
  corn:         { n:"トウモロコシ",e:"🌽", d:80, hd:14,  w:2, cat:"イネ科",   hs:"絹糸が茶色になり、押すと乳液が出る状態",      events:["雄穂開花","絹糸出現","収穫"], maturity:{early:70,mid:80,late:95} },
  soba:         { n:"そば",       e:"🌿", d:75,  w:3, cat:"タデ科",   hs:"実の7〜8割が黒褐色になったら",                events:["開花","収穫"], maturity:{early:65,mid:75,late:85} },
  // ─── ナス科 ───
  tomato:       { n:"トマト",     e:"🍅", d:90, hd:60,  w:2, cat:"ナス科",   hs:"果皮が均一に赤くなりヘタが反り返ったら",      events:["第1花房開花","着果","摘芯","第1果肥大","色づき開始","収穫開始","収穫終了","わき芽処理","摘花","異常発生"], maturity:{early:75,mid:90,late:110} },
  cherry_tomato:{ n:"ミニトマト", e:"🍅", d:75,  w:2, cat:"ナス科",   hs:"鮮やかな赤になりわずかに柔らかくなったら",    events:["第1花房開花","着果","摘芯","色づき開始","収穫開始","収穫終了","異常発生"], maturity:{early:60,mid:75,late:90} },
  eggplant:     { n:"ナス",       e:"🍆", d:75, hd:90,  w:1, cat:"ナス科",   hs:"果皮に光沢・ガクのとげが鋭い状態",            events:["一番花開花","着果","摘芯","更新剪定","収穫開始","収穫終了","異常発生"], maturity:{early:65,mid:75,late:90} },
  pepper:       { n:"ピーマン",   e:"🫑", d:70, hd:90,  w:2, cat:"ナス科",   hs:"長さ6〜7cm・果肉が厚くなったら",              events:["一番花開花","着果","摘芯","収穫開始","収穫終了","異常発生"], maturity:{early:60,mid:70,late:85} },
  potato:       { n:"ジャガイモ", e:"🥔", d:90,  w:3, cat:"ナス科",   hs:"地上部の葉が黄化・枯死したら掘る",            events:["萌芽","開花","地上部枯死"], maturity:{early:75,mid:90,late:110} },
  // ─── ウリ科 ───
  cucumber:     { n:"キュウリ",   e:"🥒", d:55, hd:60,  w:1, cat:"ウリ科",   hs:"長さ18〜22cm・イボが鮮明で張りがあるうちに",  events:["雄花開花","雌花開花","着果","摘芯","収穫開始","収穫終了","摘葉","異常発生"], maturity:{early:45,mid:55,late:65} },
  zucchini:     { n:"ズッキーニ", e:"🥒", d:55, hd:60,  w:1, cat:"ウリ科",   hs:"長さ20cm前後・果皮にツヤがあるうちに",        events:["雄花開花","雌花開花","着果","摘芯","収穫","異常発生"], maturity:{early:45,mid:55,late:65} },
  pumpkin:      { n:"カボチャ",   e:"🎃", d:100, w:3, cat:"ウリ科",   hs:"ヘタがコルク化し葉が枯れ始めたら",            events:["雄花開花","雌花開花","受粉","着果","摘芯","収穫","異常発生"], maturity:{early:85,mid:100,late:120} },
  watermelon:   { n:"スイカ",     e:"🍉", d:85,  w:3, cat:"ウリ科",   hs:"ヘタの巻きひげが枯れ叩くと濁音がする状態",    events:["雄花開花","雌花開花","受粉","着果","摘芯","玉返し","収穫","異常発生"], maturity:{early:75,mid:85,late:100} },
  melon:        { n:"メロン",     e:"🍈", d:90,  w:3, cat:"ウリ科",   hs:"ヘタの周りが黄色くなり香りが出たら",          events:["雄花開花","雌花開花","受粉","着果","摘芯","摘果","収穫","異常発生"], maturity:{early:75,mid:90,late:110} },
  bitter_gourd: { n:"ゴーヤ",     e:"🌿", d:60,  w:1, cat:"ウリ科",   hs:"長さ20cm前後・黄緑色均一の状態",              events:["開花","着果","摘芯","収穫開始","収穫終了","異常発生"], maturity:{early:50,mid:60,late:75} },
  // ─── アブラナ科 ───
  cabbage:      { n:"キャベツ",   e:"🥬", d:90,  w:2, cat:"アブラナ科",hs:"結球が固く締まり外葉に張りがある状態",        events:["結球開始","収穫"], maturity:{early:70,mid:90,late:120} },
  hakusai:      { n:"白菜",       e:"🥬", d:90,  w:2, cat:"アブラナ科",hs:"頭部を押して固く締まっていたら",              events:["結球開始","収穫"], maturity:{early:70,mid:90,late:110} },
  broccoli:     { n:"ブロッコリー",e:"🥦", d:90,  w:2, cat:"アブラナ科",hs:"花蕾が緊密で15〜18cm・黄色くなる前に",       events:["頂花蕾形成","収穫"], maturity:{early:75,mid:90,late:110} },
  radish:       { n:"ダイコン",   e:"🫜", d:60, hd:30,  w:2, cat:"アブラナ科",hs:"根が地表に出て肩の直径6〜8cm",               events:["間引き完了","収穫"], maturity:{early:50,mid:60,late:75} },
  turnip:       { n:"カブ",       e:"🫜", d:50, hd:20,  w:2, cat:"アブラナ科",hs:"根径5〜6cmで葉が黄化し始めたら収穫" },
  komatsuna:    { n:"小松菜",     e:"🥬", d:35, hd:14,  w:1, cat:"アブラナ科",hs:"草丈20〜25cmで収穫",                         events:["収穫"], maturity:{early:30,mid:35,late:45} },
  // ─── マメ科 ───
  edamame:      { n:"枝豆",       e:"🫛", d:70,  w:2, cat:"マメ科",   hs:"さやが膨らんで豆の形がはっきりわかる状態",    events:["開花","さや形成","収穫"], maturity:{early:60,mid:70,late:85} },
  green_bean:   { n:"インゲン",   e:"🫛", d:55, hd:30,  w:2, cat:"マメ科",   hs:"さやが膨らむ前・すじが出る前に収穫",          events:["開花","さや形成","収穫"], maturity:{early:45,mid:55,late:65} },
  pea:          { n:"エンドウ",   e:"🫛", d:60, hd:20,  w:1, cat:"マメ科",   hs:"さやが膨らみ豆が見えてきたら（実エンドウ）" },
  peanut:       { n:"落花生",     e:"🥜", d:120,hd:40,  w:2, cat:"マメ科",   hs:"葉が黄化してきたら試し掘り。完全乾燥前に収穫" },
  ginger:       { n:"ショウガ",   e:"🫚", d:150,hd:60,  w:1, cat:"ショウガ科",hs:"葉が枯れ始めたら収穫。新生姜は8〜9月" },
  azuki:        { n:"小豆",       e:"🫘", d:100, w:3, cat:"マメ科",   hs:"さやが黄褐色になり乾燥してきたら",            events:["開花","さや形成","収穫"], maturity:{early:90,mid:100,late:115} },
  // ─── キク科 ───
  lettuce:      { n:"レタス",     e:"🥬", d:55,  w:1, cat:"キク科",   hs:"結球部を押して固くなったら",                  events:["結球開始","収穫"], maturity:{early:45,mid:55,late:70} },
  // ─── セリ科 ───
  carrot:       { n:"ニンジン",   e:"🥕", d:100, hd:30, w:2, cat:"セリ科",   hs:"根頭部の直径2.5〜3cm・根長12〜15cm",          events:["間引き完了","収穫"], maturity:{early:85,mid:100,late:120} },
  // ─── ヒガンバナ科 ───
  onion:        { n:"タマネギ",   e:"🧅", d:210, w:4, cat:"ヒガンバナ科",hs:"葉の80%が倒伏し始めてから1週間後",         events:["葉鞘肥大","倒伏開始","収穫"], maturity:{early:180,mid:210,late:240} },
  leek:         { n:"ネギ",       e:"🌿", d:100, w:3, cat:"ヒガンバナ科",hs:"白根部が20〜25cmになったら",               events:["土寄せ","収穫"], maturity:{early:85,mid:100,late:120} },
  garlic:       { n:"ニンニク",   e:"🧄", d:240, w:4, cat:"ヒガンバナ科",hs:"葉が半分枯れたら",                         events:["萌芽","スケープ発生","収穫"], maturity:{early:210,mid:240,late:270} },
  // ─── ヤマノイモ科 ───
  jinenjo:      { n:"自然薯",     e:"🌿", d:210, w:4, cat:"ヤマノイモ科",hs:"葉が黄色くなり枯れ始めたら",              events:["萌芽","収穫"], maturity:{early:180,mid:210,late:240} },
  // ─── サトイモ科 ───
  taro:         { n:"里芋",       e:"🥔", d:150, w:3, cat:"サトイモ科",hs:"葉が黄化し始めたら・霜が降りる前に収穫",     events:["萌芽","増殖","収穫"], maturity:{early:130,mid:150,late:180} },
  // ─── ヒルガオ科 ───
  sweetpotato:  { n:"サツマイモ", e:"🍠", d:120, w:4, cat:"ヒルガオ科",hs:"定植後120〜130日・試し掘りで確認",           events:["活着","収穫"], maturity:{early:110,mid:120,late:140} },
  // ─── バラ科 ───
  strawberry:   { n:"イチゴ",     e:"🍓", d:180, hd:60, w:1, cat:"バラ科",   hs:"果実全体が赤く着色しヘタが反り返ったら",      events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:210} },
  // ─── アカザ科 ───
  spinach:      { n:"ほうれん草", e:"🌿", d:40,  w:1, cat:"アカザ科",  hs:"草丈20〜25cm・本葉がしっかり展開したら",      events:["本葉展開","収穫"], maturity:{early:35,mid:40,late:50} },
  // ─── タデ科 ───
  // ─── オクラ（アオイ科）───
  okra:         { n:"オクラ",     e:"🌿", d:60, hd:60,  w:1, cat:"アオイ科",  hs:"長さ7〜8cm・開花後4〜5日で収穫",              events:["開花","摘芯","収穫開始","収穫終了","異常発生"], maturity:{early:55,mid:60,late:70} },
  // ─── 果樹（バラ科）───
  apple:        { n:"リンゴ",     e:"🍎", d:150, w:5, cat:"果樹/バラ科",hs:"品種固有の色に着色し、甘みが出たら",        events:["開花","摘果","着色","収穫"], maturity:{early:120,mid:150,late:180}, fruit:true },
  pear:         { n:"ナシ",       e:"🍐", d:140, w:5, cat:"果樹/バラ科",hs:"果皮が品種特有の色になり香りが出たら",       events:["開花","摘果","収穫"], maturity:{early:120,mid:140,late:160}, fruit:true },
  peach:        { n:"モモ",       e:"🍑", d:100, w:4, cat:"果樹/バラ科",hs:"果皮が品種特有の色になり果肉が軟化したら",   events:["開花","摘果","収穫"], maturity:{early:80,mid:100,late:120}, fruit:true },
  cherry:       { n:"サクランボ", e:"🍒", d:50,  w:3, cat:"果樹/バラ科",hs:"果皮が濃い赤色になり甘みが出たら",          events:["開花","収穫"], maturity:{early:40,mid:50,late:60}, fruit:true },
  plum:         { n:"ウメ",       e:"🌸", d:90,  w:4, cat:"果樹/バラ科",hs:"梅酒用は青いうち・梅干し用は黄色くなったら",events:["開花","収穫"], maturity:{early:80,mid:90,late:100}, fruit:true },
  // ─── 果樹（ミカン科）───
  mikan:        { n:"ミカン",     e:"🍊", d:180, w:5, cat:"果樹/ミカン科",hs:"果皮がオレンジ色になり酸味が落ち着いたら",events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:210}, fruit:true },
  lemon:        { n:"レモン",     e:"🍋", d:180, w:5, cat:"果樹/ミカン科",hs:"果皮が黄色くなったら",                     events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:200}, fruit:true },
  yuzu:         { n:"ユズ",       e:"🍋", d:180, w:5, cat:"果樹/ミカン科",hs:"果皮が黄色くなったら",                     events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:200}, fruit:true },
  // ─── 果樹（ブドウ科）───
  grape:        { n:"ブドウ",     e:"🍇", d:120, w:4, cat:"果樹/ブドウ科",hs:"果皮が品種の色になり糖度が上がったら",     events:["開花","摘粒","着色","収穫"], maturity:{early:100,mid:120,late:140}, fruit:true },
  // ─── 果樹（カキノキ科）───
  persimmon:    { n:"カキ",       e:"🧡", d:180, w:5, cat:"果樹/カキノキ科",hs:"果皮がオレンジ色になり渋が抜けたら",    events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:200}, fruit:true },
  // ─── 果樹（その他）───
  blueberry:    { n:"ブルーベリー",e:"🫐", d:60,  w:3, cat:"果樹/ツツジ科",hs:"果皮が濃い青紫色になり甘みが出たら",     events:["開花","着果","収穫"], maturity:{early:50,mid:60,late:75}, fruit:true },
  fig:          { n:"イチジク",   e:"🍈", d:90,  w:3, cat:"果樹/クワ科",hs:"果皮が品種の色になり果頂部が裂け始めたら",  events:["着果","収穫"], maturity:{early:80,mid:90,late:100}, fruit:true },
  kiwi:         { n:"キウイ",     e:"🥝", d:180, w:4, cat:"果樹/マタタビ科",hs:"果実が硬いまま収穫し追熟させる",        events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:200}, fruit:true },
  biwa:         { n:"ビワ",       e:"🍊", d:150, w:4, cat:"果樹/バラ科",hs:"果皮がオレンジ色になり甘みが出たら",        events:["開花","着果","収穫"], maturity:{early:130,mid:150,late:170}, fruit:true },
};

// ─── 栽培ガイド: 今日やること推奨 ───────────────────────────

// ─── 科別・連作障害DB ────────────────────────────────────────
const FAMILY_DB={
  rice:"イネ科",wheat:"イネ科",corn:"イネ科",soba:"タデ科",tomato:"ナス科",
  cherry_tomato:"ナス科",eggplant:"ナス科",pepper:"ナス科",potato:"ナス科",cucumber:"ウリ科",
  zucchini:"ウリ科",pumpkin:"ウリ科",watermelon:"ウリ科",melon:"ウリ科",bitter_gourd:"ウリ科",
  cabbage:"アブラナ科",hakusai:"アブラナ科",broccoli:"アブラナ科",radish:"アブラナ科",komatsuna:"アブラナ科",
  turnip:"アブラナ科",
  edamame:"マメ科",green_bean:"マメ科",azuki:"マメ科",lettuce:"キク科",carrot:"セリ科",
  pea:"マメ科",
  peanut:"マメ科",
  ginger:"ショウガ科",
  onion:"ヒガンバナ科",leek:"ヒガンバナ科",garlic:"ヒガンバナ科",jinenjo:"ヤマノイモ科",taro:"サトイモ科",
  sweetpotato:"ヒルガオ科",strawberry:"バラ科",spinach:"アカザ科",okra:"アオイ科",apple:"バラ科",
  pear:"バラ科",peach:"バラ科",cherry:"バラ科",plum:"バラ科",mikan:"ミカン科",
  lemon:"ミカン科",yuzu:"ミカン科",grape:"ブドウ科",persimmon:"カキノキ科",blueberry:"ツツジ科",
  fig:"クワ科",kiwi:"マタタビ科",biwa:"バラ科",
};
const ROTATION_DB={
  // ─── ナス科（連作障害が出やすい）───
  tomato:      {years:4,ng:["ナス科"]},
  cherry_tomato:{years:4,ng:["ナス科"]},
  eggplant:    {years:4,ng:["ナス科"]},
  pepper:      {years:4,ng:["ナス科"]},
  potato:      {years:3,ng:["ナス科"]},
  // ─── ウリ科 ───
  cucumber:    {years:3,ng:["ウリ科"]},
  zucchini:    {years:2,ng:["ウリ科"]},
  pumpkin:     {years:2,ng:["ウリ科"]},
  watermelon:  {years:5,ng:["ウリ科"]},
  melon:       {years:4,ng:["ウリ科"]},
  bitter_gourd:{years:3,ng:["ウリ科"]},
  // ─── アブラナ科 ───
  cabbage:     {years:2,ng:["アブラナ科"]},
  hakusai:     {years:2,ng:["アブラナ科"]},
  broccoli:    {years:2,ng:["アブラナ科"]},
  radish:      {years:1,ng:["アブラナ科"]},
  turnip:      {years:1,ng:["アブラナ科"]},
  komatsuna:   {years:1,ng:["アブラナ科"]},
  // ─── マメ科 ───
  edamame:     {years:3,ng:["マメ科"]},
  green_bean:  {years:2,ng:["マメ科"]},
  pea:         {years:4,ng:["マメ科"]},
  peanut:      {years:3,ng:["マメ科"]},
  ginger:      {years:3,ng:["ショウガ科"]},
  azuki:       {years:3,ng:["マメ科"]},
  // ─── キク科 ───
  lettuce:     {years:2,ng:["キク科"]},
  // ─── セリ科 ───
  carrot:      {years:2,ng:["セリ科"]},
  // ─── ヒガンバナ科 ───
  onion:       {years:1,ng:["ヒガンバナ科"]},
  leek:        {years:1,ng:["ヒガンバナ科"]},
  garlic:      {years:2,ng:["ヒガンバナ科"]},
  // ─── 根菜・イモ ───
  jinenjo:     {years:3,ng:["ヤマノイモ科"]},
  taro:        {years:3,ng:["サトイモ科"]},
  sweetpotato: {years:1,ng:["ヒルガオ科"]},
  // ─── その他葉物・果菜 ───
  strawberry:  {years:2,ng:["バラ科"]},
  spinach:     {years:1,ng:["アカザ科"]},
  okra:        {years:2,ng:["アオイ科"]},
  // ─── イネ科・穀物（連作可だが目安）───
  rice:        {years:0,ng:[]},
  wheat:       {years:1,ng:["イネ科"]},
  corn:        {years:1,ng:["イネ科"]},
  soba:        {years:1,ng:["タデ科"]},
  // ─── 果樹（多年栽培のため連作チェック対象外＝0年）───
  apple:       {years:0,ng:[]},
  pear:        {years:0,ng:[]},
  peach:       {years:0,ng:[]},
  cherry:      {years:0,ng:[]},
  plum:        {years:0,ng:[]},
  mikan:       {years:0,ng:[]},
  lemon:       {years:0,ng:[]},
  yuzu:        {years:0,ng:[]},
  grape:       {years:0,ng:[]},
  persimmon:   {years:0,ng:[]},
  blueberry:   {years:0,ng:[]},
  fig:         {years:0,ng:[]},
  kiwi:        {years:0,ng:[]},
  biwa:        {years:0,ng:[]},
};
const getFertSchedule=(cropType,plantTargetDate)=>{
  if(!plantTargetDate)return null;
  const target=new Date(plantTargetDate);
  const fmt=d=>`${d.getMonth()+1}/${d.getDate()}`;
  const d1=new Date(target);d1.setDate(d1.getDate()-21);
  const d2=new Date(target);d2.setDate(d2.getDate()-14);
  const d3=new Date(target);d3.setDate(d3.getDate()-7);
  const plan=getFertPlan(cropType);
  return[
    {date:fmt(d1),work:"苦土石灰散布",note:"pH調整（10㎡あたり150-200g）"},
    {date:fmt(d2),work:"牛糞堆肥投入",note:"10㎡あたり2-3kg・耕耺"},
    {date:fmt(d3),work:"元肥投入",note:plan.base},
    {date:fmt(target),work:"定植・播種",note:""},
  ];
};
// ─────────────────────────────────────────────────────────────

// ─── 施肥ガイドDB (10㎡あたり・NPK8-8-8換算) ───────────────
// 品目ごとの標準的な育苗日数（播種から定植まで・日）。育苗後定植の品目で定植予定の計算に使用
const NURSERY_DAYS = {
  tomato:50, cherry_tomato:50, eggplant:55, pepper:55, cucumber:30, zucchini:30, pumpkin:35, watermelon:35, melon:35, bitter_gourd:35, okra:30,
  cabbage:35, hakusai:30, broccoli:35, lettuce:30, leek:60,
  strawberry:30, edamame:25, green_bean:25,
  // その他は概ね30日を目安
};

// 品目ごとの標準的な追肥間隔（日）。リマインダーの次回予定計算に使用
const FERT_INTERVAL = {
  // 果菜類（長期収穫・多肥）は2週間ごと
  tomato:14, cherry_tomato:14, eggplant:14, pepper:14, cucumber:14, zucchini:18, pumpkin:21, watermelon:21, melon:21, bitter_gourd:14, okra:18, strawberry:21,
  // 葉茎菜（生育期間中1〜2回）
  cabbage:21, hakusai:18, broccoli:18, lettuce:21, spinach:0, komatsuna:0, leek:25,
  // 根菜（基本は元肥中心、追肥少なめ）
  radish:0, carrot:25, onion:30, garlic:30, potato:25, sweetpotato:0, taro:30, jinenjo:30,
  // マメ科（窒素固定するので追肥控えめ）
  edamame:0, green_bean:21, azuki:0,
  pea:21, peanut:30, ginger:30,
  // 穀物
  rice:30, wheat:40, corn:21, soba:0,
  // 果樹（年単位なので追肥リマインダーは出さない）
  apple:0, pear:0, peach:0, cherry:0, plum:0, mikan:0, lemon:0, yuzu:0, grape:0, persimmon:0, blueberry:0, fig:0, kiwi:0, biwa:0,
};

const FERT_GUIDE = {
  // ナス科
  tomato:      { base:"定植1週前: 苦土石灰150g→堆肥2kg→化成(8-8-8)150g", chase:[
    {timing:"第1花房着果後（花が咲いて2週間）",amt:"株元から20cm離して化成8-8-8 30g/株"},
    {timing:"その後2〜3週間ごと",amt:"化成8-8-8 30g/株 または液肥1000倍希釈"},
    {timing:"収穫最盛期",amt:"やや増量して40g/株・カリ多めが効果的"},
  ], tip:"窒素多すぎると茎葉が茂り着果しない。花が落ちたら追肥を疑って" },
  eggplant:    { base:"定植1週前: 苦土石灰150g→堆肥3kg→化成8-8-8 200g", chase:[
    {timing:"定植3週後（活着後）",amt:"化成40g/株"},
    {timing:"収穫始まったら2週ごと",amt:"化成40g/株（多肥好む）"},
    {timing:"更新剪定後",amt:"即座に化成8-8-8 50g/株・液肥も効果的"},
  ], tip:"多肥を好む。葉色が薄くなったらすぐ追肥" },
  pepper:      { base:"定植1週前: 苦土石灰150g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"定植4週後",amt:"化成8-8-8 30g/株"},
    {timing:"その後3週間ごと",amt:"化成8-8-8 30g/株"},
  ], tip:"肥料切れすると着果不良に" },
  potato:      { base:"植付時: 堆肥2kg→化成8-8-8 150g（苦土石灰不要・そうか病の原因）", chase:[
    {timing:"芽かき後（萌芽2〜3週後）",amt:"化成8-8-8 50g/株・土寄せと同時に"},
  ], tip:"元肥にリン酸多めが芋の肥大に効果的" },
  // ウリ科
  cucumber:    { base:"定植1週前: 苦土石灰100g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"定植2週後",amt:"化成8-8-8 30g/株"},
    {timing:"収穫始まったら10〜14日ごと",amt:"化成8-8-8 30g/株または液肥"},
    {timing:"収穫最盛期",amt:"液肥を週1回追加"},
  ], tip:"肥料切れが早い。葉色が薄くなる前に追肥" },
  zucchini:    { base:"定植1週前: 苦土石灰100g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"開花始まったら（定植3週後頃）",amt:"化成8-8-8 30g/株"},
    {timing:"その後2週間ごと",amt:"化成8-8-8 30g/株"},
  ], tip:"大型になりやすいので肥料は控えめに" },
  pumpkin:     { base:"定植1週前: 苦土石灰100g→堆肥2kg→化成8-8-8 100g", chase:[
    {timing:"果実が卵大になった頃",amt:"化成8-8-8 30g/株"},
  ], tip:"窒素多いと茎葉が茂り実がならない" },
  watermelon:  { base:"定植2週前: 苦土石灰100g→堆肥2kg→化成8-8-8 100g", chase:[
    {timing:"着果確認後（果実が鶏卵大）",amt:"化成8-8-8 30g/株"},
  ], tip:"着果前の追肥は禁物。着果後に1回のみ" },
  bitter_gourd:{ base:"定植1週前: 苦土石灰100g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"定植2週後",amt:"化成8-8-8 30g/株"},
    {timing:"収穫始まったら2週ごと",amt:"化成8-8-8 30g/株"},
  ], tip:"" },
  // アブラナ科
  cabbage:     { base:"定植1週前: 苦土石灰200g→堆肥3kg→化成8-8-8 150g", chase:[
    {timing:"定植2週後（活着後）",amt:"化成8-8-8 50g/㎡"},
    {timing:"結球開始時（外葉10枚頃）",amt:"化成8-8-8 50g/㎡・重要な追肥"},
  ], tip:"結球開始時の追肥が最重要" },
  broccoli:    { base:"定植1週前: 苦土石灰200g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"定植3週後",amt:"化成8-8-8 50g/㎡"},
    {timing:"頂花蕾収穫後（側花蕾を増やす）",amt:"化成8-8-8 30g/㎡"},
  ], tip:"頂花蕾収穫後も追肥して側花蕾を収穫" },
  hakusai:     { base:"播種3週前: 苦土石灰150g→堆肥3kg→化成8-8-8 150g", chase:[
    {timing:"定植2週後",amt:"化成40g/㎡"},
    {timing:"結球開始時",amt:"化成8-8-8 50g/㎡・重要"},
  ], tip:"結球期に肥料切れすると中が詰まらない" },
  komatsuna:   { base:"播種1週前: 苦土石灰100g→堆肥1kg→化成8-8-8 100g", chase:[
    {timing:"本葉2〜3枚（間引き後）",amt:"化成8-8-8 30g/㎡"},
  ], tip:"短期作物なので元肥主体" },
  // 根菜
  carrot:      { base:"2週前: 苦土石灰100g→堆肥1kg→化成8-8-8 100g（石灰は早めに）", chase:[
    {timing:"本葉5〜6枚（間引き後）",amt:"化成40g/㎡"},
    {timing:"本葉10枚頃",amt:"化成40g/㎡"},
  ], tip:"カリを多めに。窒素多いと又根になりやすい" },
  radish:      { base:"播種2週前: 苦土石灰100g→堆肥1kg→化成8-8-8 100g", chase:[
    {timing:"本葉4〜5枚（間引き後）",amt:"化成40g/㎡"},
  ], tip:"短期作物。過剰施肥は又根・空洞の原因" },
  sweetpotato: { base:"植付前: 堆肥2kg（元肥は少なめ）", chase:[
    {timing:"基本不要",amt:"肥料多いと葉ばかり茂り芋がつかない"},
  ], tip:"やせた土でも育つ。肥料のやりすぎに注意" },
  onion:       { base:"定植3週前: 苦土石灰150g→堆肥1kg→化成8-8-8 100g", chase:[
    {timing:"12月初旬（越冬前）",amt:"化成8-8-8 50g/㎡"},
    {timing:"2月下旬〜3月（玉肥大期）",amt:"化成8-8-8 50g/㎡（最重要）"},
    {timing:"3月下旬以降は追肥禁止",amt:"貯蔵性が下がるためNG"},
  ], tip:"3月下旬以降の追肥は厳禁" },
  garlic:      { base:"植付前: 苦土石灰100g→堆肥1kg→化成8-8-8 100g", chase:[
    {timing:"12月（休眠前）",amt:"化成8-8-8 50g/㎡"},
    {timing:"2月（萌芽後）",amt:"化成8-8-8 50g/㎡"},
    {timing:"4月（鱗茎肥大期）",amt:"化成8-8-8 50g/㎡"},
  ], tip:"" },
  leek:        { base:"定植前: 苦土石灰150g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"定植1ヶ月後",amt:"化成8-8-8 50g/㎡・土寄せと同時に"},
    {timing:"その後1ヶ月ごと（土寄せのたびに）",amt:"化成8-8-8 50g/㎡"},
  ], tip:"土寄せのたびに追肥" },
  // 葉物
  lettuce:     { base:"播種2週前: 苦土石灰150g→堆肥1kg→化成8-8-8 100g", chase:[
    {timing:"本葉5〜6枚",amt:"化成8-8-8 30g/㎡"},
  ], tip:"短期なので元肥主体。結球前に肥料切れ注意" },
  spinach:     { base:"播種2週前: 苦土石灰200g→堆肥1kg→化成8-8-8 100g（酸性に弱い）", chase:[
    {timing:"本葉2〜3枚（間引き後）",amt:"化成8-8-8 30g/㎡"},
  ], tip:"苦土石灰は必須。酸性土壌では発芽しない" },
  edamame:     { base:"播種前: 苦土石灰100g→堆肥1kg→化成8-8-8 50g（少なめ）", chase:[
    {timing:"開花始まった頃",amt:"化成8-8-8 30g/㎡（カリ多めで莢が充実）"},
  ], tip:"マメ科なので窒素は少なめ。根粒菌が固定する" },
  strawberry:  { base:"定植3週前: 苦土石灰150g→堆肥2kg→化成8-8-8 100g（リン多め）", chase:[
    {timing:"10月中旬（活着後）",amt:"化成8-8-8 30g/株"},
    {timing:"2月（花芽形成期）",amt:"化成20g/株（控えめに）"},
    {timing:"収穫後（ランナー育成期）",amt:"化成8-8-8 30g/株"},
  ], tip:"窒素多すぎると葉ばかり茂り甘くならない" },
  // 果樹
  apple:       { base:"落葉後11〜12月: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"6月（生理落果後）",amt:"化成8-8-8 100g/㎡（果実肥大）"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"" },
  blueberry:   { base:"2〜3月: 硫安または専用肥料（酸性好む・苦土石灰不要）", chase:[
    {timing:"5月（果実肥大期）",amt:"専用肥料50g/株"},
    {timing:"収穫後（礼肥）",amt:"専用肥料50g/株"},
  ], tip:"pH4.5〜5.5の酸性土壌が必要。苦土石灰はNG" },
  // 追加品目
  cherry_tomato:{ base:"定植1週前: 苦土石灰150g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"第1花房着果後",amt:"化成8-8-8 20g/株"},
    {timing:"その後2〜3週ごと",amt:"化成8-8-8 20g/株または液肥1000倍"},
  ], tip:"窒素多すぎ注意。トマトより少なめが基本" },
  corn:        { base:"播種2週前: 苦土石灰150g→堆肥2kg→化成8-8-8 150g", chase:[
    {timing:"草丈30cm頃（本葉6〜7枚）",amt:"化成8-8-8 50g/㎡・土寄せと同時に"},
    {timing:"雄穂出穂前（草丈80cm頃）",amt:"化成8-8-8 50g/㎡"},
  ], tip:"密植で雌雄の受粉率UP。2列以上植えると着粒良好" },
  okra:        { base:"定植1週前: 苦土石灰100g→堆肥2kg→化成8-8-8 100g", chase:[
    {timing:"開花始まった頃",amt:"化成8-8-8 30g/株"},
    {timing:"収穫最盛期以降は2週ごと",amt:"化成8-8-8 30g/株"},
  ], tip:"乾燥に強いが肥料は継続的に必要" },
  soba:        { base:"播種前: 苦土石灰100g→化成8-8-8 50g（少なめ）", chase:[
    {timing:"基本不要",amt:"肥料多いと倒伏しやすい"},
  ], tip:"やせた土でも育つ。窒素過多は倒伏の原因" },
  rice:        { base:"田植え前: 元肥として窒素成分5kg/10a程度", chase:[
    {timing:"分げつ期（田植え2〜3週後）",amt:"追肥窒素3kg/10a（分げつ促進）"},
    {timing:"穂肥（出穂35日前）",amt:"窒素3kg/10a（収量・品質に影響大）"},
  ], tip:"穂肥のタイミングが品質の決め手" },
  wheat:       { base:"播種前: 苦土石灰200g/㎡→化成8-8-8 150g/㎡", chase:[
    {timing:"分げつ期（播種2ヶ月後）",amt:"化成8-8-8 50g/㎡"},
    {timing:"節間伸長期（3月頃）",amt:"化成8-8-8 50g/㎡（穂数・粒数確保）"},
  ], tip:"窒素多すぎると倒伏。分施が基本" },
  taro:        { base:"植付前: 苦土石灰100g→堆肥3kg→化成8-8-8 150g", chase:[
    {timing:"草丈20cm頃",amt:"化成8-8-8 50g/㎡"},
    {timing:"その後1ヶ月ごと2回",amt:"化成8-8-8 50g/㎡・土寄せと同時に"},
  ], tip:"土寄せのたびに追肥。乾燥を嫌うので水分確保" },
  jinenjo:     { base:"植付前: 苦土石灰100g→堆肥2kg→化成8-8-8 100g", chase:[
    {timing:"草丈30cm頃（6月）",amt:"化成8-8-8 50g/㎡"},
    {timing:"8月頃（芋肥大期）",amt:"化成8-8-8 50g/㎡"},
  ], tip:"深耕が重要。肥料の与えすぎに注意" },
  melon:       { base:"定植2週前: 苦土石灰100g→堆肥2kg→化成8-8-8 100g", chase:[
    {timing:"着果確認後（果実が卵大）",amt:"化成8-8-8 30g/株"},
    {timing:"果実肥大期（着果2〜3週後）",amt:"化成8-8-8 30g/株"},
  ], tip:"着果前の追肥は茎葉ばかり茂る原因。着果後に開始" },
  green_bean:  { base:"播種2週前: 苦土石灰100g→堆肥1kg→化成8-8-8 50g（少なめ）", chase:[
    {timing:"開花始まった頃",amt:"化成8-8-8 30g/㎡"},
  ], tip:"マメ科なので窒素は少なめ。カリ多めで莢の質UP" },
  azuki:       { base:"播種2週前: 苦土石灰100g→堆肥1kg→化成8-8-8 50g", chase:[
    {timing:"開花始まった頃",amt:"化成8-8-8 30g/㎡"},
  ], tip:"マメ科。根粒菌のために窒素は控えめに" },
  pear:        { base:"落葉後11〜12月: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"6月（生理落果後）",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"摘果が重要。1果房1果に絞ると大玉になる" },
  peach:       { base:"落葉後: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"6月（生理落果後）",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"硬核期（5月）は追肥を避ける" },
  cherry:      { base:"落葉後11月: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"自家不和合性があるため2品種以上植える" },
  plum:        { base:"落葉後: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"耐病性強く育てやすい。摘果で大玉に" },
  grape:       { base:"落葉後2〜3月: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"展葉後（5月）",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"新梢管理と摘粒が糖度の鍵" },
  mikan:       { base:"2〜3月: 有機質肥料主体+化成8-8-8 200g/㎡", chase:[
    {timing:"6月（第2落果後）",amt:"化成8-8-8 100g/㎡"},
    {timing:"9月（着色期）",amt:"カリ多めの肥料100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"有機質肥料主体"},
  ], tip:"隔年結果に注意。摘果で毎年安定収穫を" },
  lemon:       { base:"2〜3月: 化成8-8-8 200g/㎡", chase:[
    {timing:"6月",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後",amt:"化成8-8-8 100g/㎡"},
  ], tip:"耐寒性弱いので寒冷地では鉢植えが安全" },
  yuzu:        { base:"2〜3月: 有機質肥料主体+化成100g/㎡", chase:[
    {timing:"6月",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後",amt:"有機質肥料主体"},
  ], tip:"耐寒性あり、育てやすい柑橘類" },
  persimmon:   { base:"2〜3月: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"6月（生理落果後）",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"隔年結果しやすい。摘果で安定生産を" },
  fig:         { base:"2〜3月: 堆肥3kg→化成8-8-8 150g/㎡", chase:[
    {timing:"5月（着果期）",amt:"化成8-8-8 100g/㎡"},
    {timing:"7月（夏果収穫後）",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"窒素多すぎると着果不良。カリ多めが実の品質UP" },
  kiwi:        { base:"2〜3月: 堆肥5kg→化成8-8-8 200g/㎡", chase:[
    {timing:"6月",amt:"化成8-8-8 100g/㎡"},
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"雌雄異株。雄木を1本以上一緒に植える" },
  biwa:        { base:"2〜3月: 堆肥3kg→化成8-8-8 150g/㎡", chase:[
    {timing:"収穫後（礼肥）",amt:"化成8-8-8 100g/㎡"},
    {timing:"9〜10月（花芽分化前）",amt:"化成8-8-8 100g/㎡"},
  ], tip:"摘果で大玉に。1花穂4〜5果に絞る" },
};
// ─────────────────────────────────────────────────────────────
const CROP_TEMP = {
  rice:[20,28],wheat:[10,20],corn:[20,30],soba:[15,22],
  tomato:[18,25],cherry_tomato:[18,25],eggplant:[20,30],pepper:[18,28],
  cucumber:[18,28],zucchini:[18,28],pumpkin:[18,28],watermelon:[20,30],
  melon:[20,28],bitter_gourd:[22,30],
  cabbage:[15,20],hakusai:[15,20],broccoli:[15,20],radish:[15,20],komatsuna:[10,20],
  edamame:[20,28],green_bean:[18,25],azuki:[20,28],
  lettuce:[15,20],spinach:[10,20],carrot:[15,21],onion:[15,20],
  leek:[15,25],garlic:[15,20],okra:[22,30],
  potato:[15,21],sweetpotato:[20,30],taro:[20,30],jinenjo:[15,25],
  strawberry:[15,25],
  apple:[10,20],pear:[10,20],peach:[15,25],cherry:[10,20],
  plum:[10,20],mikan:[18,28],lemon:[15,28],yuzu:[15,25],
  grape:[15,25],persimmon:[20,28],blueberry:[15,25],fig:[20,30],
  kiwi:[15,25],biwa:[15,25],
  parsley:[15,20],basil:[18,25]
};

const getRecommendedTasks = (crop, logs) => {
  const db = CDB[crop.type] || {};
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const plantDate = crop.plantDate || crop.sowDate;
  const days = plantDate ? Math.floor((Date.now() - new Date(plantDate)) / 86400000) : null;
  const harvestD = parseInt(crop.harvestDays)||db.maturity?.[crop.maturity||"mid"]||db.d||90;
  const pct = days !== null ? Math.min(100, Math.round(days / harvestD * 100)) : null;
  const lastLog = logs.length > 0 ? logs.reduce((a,b)=>(a.date||'')>(b.date||'')?a:b) : null;
  const daysSinceLog = lastLog?.date ? Math.floor((Date.now()-new Date(lastLog.date))/86400000) : 99;
  const isFruit = db.fruit || false;
  const tasks = [];

  // ── 果樹 ──
  if(isFruit){
    const fruitGuide = {
      apple:   [{m:[11,12,1,2],t:'剪定'},{m:[4],t:'人工授粉'},{m:[5,6],t:'摘花・摘果'},{m:[6,7],t:'袋かけ'},{m:[7,8],t:'病害虫チェック'},{m:[3,9,10],t:'施肥（追肥）'},{m:[11],t:'落葉後に元肥'}],
      pear:    [{m:[11,12,1,2],t:'剪定'},{m:[4],t:'人工授粉'},{m:[5,6],t:'摘花・摘果'},{m:[6,7],t:'袋かけ'},{m:[3,9],t:'施肥（追肥）'}],
      peach:   [{m:[12,1,2],t:'剪定'},{m:[3,4],t:'人工授粉・摘花'},{m:[5,6],t:'摘果・袋かけ'},{m:[8,9],t:'施肥（礼肥）'}],
      cherry:  [{m:[12,1,2],t:'剪定'},{m:[3,4],t:'人工授粉'},{m:[5,6],t:'収穫'},{m:[9,10],t:'施肥（元肥）'}],
      plum:    [{m:[12,1],t:'剪定'},{m:[2,3],t:'人工授粉'},{m:[5],t:'摘果'},{m:[9,10],t:'施肥（元肥）'}],
      mikan:   [{m:[2,3],t:'剪定・施肥'},{m:[6],t:'摘果（生理落果後）'},{m:[9,10],t:'収穫管理'},{m:[11,12],t:'収穫・施肥（礼肥）'}],
      grape:   [{m:[1,2],t:'剪定'},{m:[4,5],t:'芽かき・誘引'},{m:[5,6],t:'摘花・ジベレリン処理'},{m:[6,7],t:'摘粒・袋かけ'},{m:[8,9],t:'収穫'},{m:[10,11],t:'施肥（礼肥）'}],
      persimmon:[{m:[12,1,2],t:'剪定'},{m:[5,6],t:'摘花・摘果'},{m:[9,10,11],t:'収穫'},{m:[2,9],t:'施肥'}],
      blueberry:[{m:[1,2],t:'剪定'},{m:[3,4],t:'施肥（元肥）'},{m:[5,6,7],t:'収穫'},{m:[10,11],t:'施肥（礼肥）'}],
      fig:     [{m:[1,2],t:'剪定'},{m:[3],t:'施肥（元肥）'},{m:[7,8,9,10],t:'収穫'},{m:[11],t:'施肥（礼肥）'}],
      lemon:   [{m:[2,3],t:'剪定・施肥'},{m:[5,6],t:'摘花'},{m:[11,12,1],t:'収穫'}],
      yuzu:    [{m:[1,2],t:'剪定'},{m:[3],t:'施肥（元肥）'},{m:[11,12],t:'収穫・施肥（礼肥）'}],
      strawberry:[{m:[8,9],t:'ランナーから苗取り・定植'},{m:[10,11],t:'マルチ張り・施肥'},{m:[12,1,2],t:'寒冷紗で防寒・灌水注意'},{m:[3],t:'花芽確認・追肥'},{m:[4,5,6],t:'収穫・ランナー管理'},{m:[7],t:'親株整理'}],
      kiwi:    [{m:[1,2],t:'剪定'},{m:[5],t:'人工授粉・摘花'},{m:[6],t:'摘果'},{m:[10,11],t:'収穫・施肥（礼肥）'}],
      biwa:    [{m:[10,11,12],t:'摘花・摘果'},{m:[1,2,3],t:'袋かけ・施肥'},{m:[5,6],t:'収穫'},{m:[7,8],t:'剪定・施肥（礼肥）'}],
    };
    const guide = fruitGuide[crop.type] || [];
    const todayTasks = guide.filter(g=>g.m.includes(month)).map(g=>g.t);
    if(todayTasks.length > 0) tasks.push(...todayTasks);
    else tasks.push('定期見回り・病害虫チェック');
    return tasks.slice(0,3);
  }

  // ── 一年生野菜・穀物 ──
  if(days === null){ tasks.push('定植・播種日を記録してください'); return tasks; }

  // 播種直後（0-14日）
  if(days <= 14){
    tasks.push('発芽確認・水やり');
    if(crop.cultivationType !== 'direct') tasks.push('活着確認');
    return tasks;
  }

  // 施肥タイミング（追肥目安: 2-3週間ごと）
  const lastFert = logs.filter(l=>l.work==='fert').sort((a,b)=>(b.date||'')>(a.date||'')?1:-1)[0];
  const daysSinceFert = lastFert?.date ? Math.floor((Date.now()-new Date(lastFert.date))/86400000) : 99;
  if(daysSinceFert >= 21) tasks.push('追肥のタイミングです');

  // 防除タイミング（2週間ごと目安）
  const lastPest = logs.filter(l=>l.work==='pest').sort((a,b)=>(b.date||'')>(a.date||'')?1:-1)[0];
  const daysSincePest = lastPest?.date ? Math.floor((Date.now()-new Date(lastPest.date))/86400000) : 99;
  if(daysSincePest >= 14 && pct > 20) tasks.push('病害虫チェック・防除');

  // 生育ステージ別
  if(pct < 30){
    tasks.push('生育初期: 水やり・草取り');
    if(['tomato','eggplant','pepper','cucumber'].includes(crop.type)) tasks.push('支柱立て・誘引');
  } else if(pct < 60){
    tasks.push('生育中期: 水やり管理');
    if(['tomato'].includes(crop.type)) tasks.push('脇芽かき');
    if(['tomato','eggplant','pepper','cucumber','bitter_gourd'].includes(crop.type)) tasks.push('誘引・整枝');
    if(['cabbage','hakusai','broccoli'].includes(crop.type)) tasks.push('結球確認');
  } else if(pct < 90){
    tasks.push('収穫まで'+Math.max(0,Math.round(harvestD-days))+'日: 水切り管理');
    if(['tomato','eggplant','pepper','cucumber'].includes(crop.type)) tasks.push('着色・肥大確認');
  } else {
    tasks.push('🎉 収穫時期です！');
  }

  // 作業間隔が長い場合
  if(daysSinceLog >= 7 && tasks.length < 2) tasks.push('見回り・生育記録を残しましょう');

  // 連作障害注意
  const rotationRisk = {
    tomato:7,cherry_tomato:7,eggplant:5,pepper:5,potato:4,
    cucumber:3,watermelon:5,strawberry:4,spinach:3,burdock:5
  };
  if(rotationRisk[crop.type]){
    tasks.push('連作障害注意: '+rotationRisk[crop.type]+'年以上空けましょう');
  }

  return tasks.slice(0,3);
};

// 施肥設計（10㎡あたりの目安）
const getFertPlan = (cropType) => {
  const plans = {
    tomato:    {base:'元肥: 苦土石灰150g→1週間後 牛糞堆肥2kg 化成8-8-8150g', chase:'追肥: 2-3週ごと液肥または化成8-8-8 50g', note:'窒素過多に注意'},
    eggplant:  {base:'元肥: 苦土石灰150g→1週間後 牛糞堆肥3kg 化成8-8-8 200g', chase:'追肥: 収穫始まったら2週ごと化成8-8-8 50g', note:'多肥を好む'},
    cucumber:  {base:'元肥: 苦土石灰100g→1週間後 牛糞堆肥2kg 化成8-8-8 150g', chase:'追肥: 2週ごと化成8-8-8 50g', note:'窒素多め'},
    pepper:    {base:'元肥: 苦土石灰150g→1週間後 牛糞堆肥2kg 化成8-8-8 150g', chase:'追肥: 3週ごと化成8-8-8 50g', note:''},
    potato:    {base:'元肥: 苦土石灰不要(酸性好む) 牛糞堆肥2kg 化成8-8-8 150g', chase:'追肥: 芽かき後に1回 化成8-8-8 50g', note:'石灰はそうか病の原因'},
    sweetpotato:{base:'元肥: 牛糞堆肥2kg のみ(肥料少なめ)', chase:'追肥: 基本不要', note:'肥料多いと葉ばかり茂る'},
    onion:     {base:'元肥: 苦土石灰150g→1週間後 牛糞堆肥1kg 化成8-8-8 100g', chase:'追肥: 12月・2月に各50g', note:''},
    carrot:    {base:'元肥: 苦土石灰100g→2週間後 牛糞堆肥1kg 化成8-8-8 100g', chase:'追肥: 本葉5枚ごろ化成8-8-8 50g', note:'石灰は早めに'},
    cabbage:   {base:'元肥: 苦土石灰200g→1週間後 牛糞堆肥3kg 化成8-8-8 150g', chase:'追肥: 定植2・4週後に各50g', note:''},
    broccoli:  {base:'元肥: 苦土石灰200g→1週間後 牛糞堆肥2kg 化成8-8-8 150g', chase:'追肥: 定植3週後 化成8-8-8 50g', note:''},
    rice:      {base:'元肥: 牛糞堆肥3kg 化成(N:P:K=14:14:14)200g', chase:'追肥: 分けつ期・穂肥に各100g', note:''},
    strawberry:{base:'元肥: 苦土石灰150g→2週間後 牛糞堆肥2kg 化成8-8-8 100g(Pリン多め)', chase:'追肥: 10月・2月・収穫後に各30g', note:'窒素控えめ'},
  };
  return plans[cropType] || {base:'元肥: 苦土石灰100-150g(2週前)→牛糞堆肥2kg+化成8-8-8 100-150g', chase:'追肥: 2-4週ごと化成8-8-8 30-50g', note:''};
};
// ─────────────────────────────────────────────────────────────
// 科別グループ化
const CROP_CATS = ["イネ科","タデ科","ナス科","ウリ科","アブラナ科","マメ科","キク科","セリ科","ヒガンバナ科","ヤマノイモ科","サトイモ科","ヒルガオ科","バラ科","アカザ科","アオイ科","果樹/バラ科","果樹/ミカン科","果樹/ブドウ科","果樹/カキノキ科","果樹/ツツジ科","果樹/クワ科","果樹/マタタビ科"];
const CROP_OPTIONS = [
  ...CROP_CATS.flatMap(cat=>{
    const items = Object.entries(CDB).filter(([,v])=>v.cat===cat);
    if(!items.length) return [];
    return [
      { value:"__group__"+cat, label:"── "+cat+" ──", disabled:true },
      ...items.map(([k,v])=>({ value:k, label:v.e+" "+v.n }))
    ];
  }),
  { value:"__group__custom", label:"── カスタム ──", disabled:true },
  { value:"custom", label:"✏️ カスタム（自由入力）" },
];
// 消耗資材カテゴリ（在庫管理あり）
const MATERIAL_CATS = ["マルチ","トンネル資材","防虫ネット","支柱・杭","プランター・育苗ポット","消耗品","その他資材"];

// ホルモン剤・生育調整剤（トマトトーン等）：農薬マスターの「種類」で区別し、作業は「ホルモン処理」として防除とは別に記録
const HORMONE_TYPE = "ホルモン剤・生育調整剤";
const isHormoneMaster = m => !!m && /ホルモン|生育調整|成長調整/.test(m.type||"");
// 農薬取締法の対象（植物成長調整剤も農薬）：農薬使用記録簿には防除とホルモン処理の両方を載せる
const isPestWork = w => w==="pest" || w==="hormone";
const isFertWork = w => w==="fert" || w==="amend"; // 土壌改良は肥料マスター（堆肥・石灰など）から在庫を引く

// 農機具カテゴリ（償却管理あり）
const EQUIP_CATS = ["手工具（鍬・スコップ等）","動力機械","ハウス設備","かん水設備","軽トラ・農用車","農機具","その他機械"];

const WORK_TYPES = [
  { value:"sow",        label:"播種",         tag:"green",  icon:"🌰" },
  { value:"germinated", label:"発芽確認",     tag:"green",  icon:"🌱", hidden:true },
  { value:"transplant", label:"定植",         tag:"purple", icon:"🪴" },
  { value:"water",      label:"水やり",       tag:"blue",   icon:"💧" },
  { value:"fert",       label:"施肥",         tag:"green",  icon:"🌿" },
  { value:"pest",       label:"防除",         tag:"yellow", icon:"🐛" },
  { value:"hormone",    label:"ホルモン処理", tag:"pink",   icon:"🧪" },
  { value:"soil",       label:"土づくり",     tag:"gray",   icon:"🚜" },
  { value:"amend",      label:"土壌改良",     tag:"green",  icon:"🧱" },
  { value:"weed",       label:"除草",         tag:"green",  icon:"🌾" },
  { value:"pruning",    label:"整枝・誘引",   tag:"green",  icon:"✂️" },
  { value:"thinning",   label:"摘果・摘花",   tag:"pink",   icon:"🌸" },
  { value:"sideshot",   label:"脇芽かき",     tag:"green",  icon:"🌱", hidden:true },
  { value:"repot",      label:"植え替え",     tag:"purple", icon:"🪣" },
  { value:"event",      label:"生育記録",     tag:"pink",   icon:"📋" },
  { value:"harvest",    label:"収穫",         tag:"pink",   icon:"🧺" },
  { value:"discard",    label:"廃棄・株調整", tag:"gray",   icon:"♻️" },
  { value:"equip",      label:"資材作業",     tag:"gray",   icon:"🏗️" },
  { value:"check",      label:"見回り",       tag:"gray",   icon:"👀", hidden:true },
  { value:"other",      label:"その他",       tag:"gray",   icon:"✏️" },
];

const WORK = {
    sow:{label:'播種',tag:'green',icon:'🌱'},
    germinated:{label:'発芽確認',tag:'green',icon:'🌿'},
    transplant:{label:'定植',tag:'purple',icon:'🪴'},
    water:{label:'水やり',tag:'blue',icon:'💧'},
    fert:{label:'施肥',tag:'teal',icon:'🌿'},
    pest:{label:'防除',tag:'yellow',icon:'🐛'},
    hormone:{label:'ホルモン処理',tag:'pink',icon:'🧪'},
    soil:{label:'土づくり',tag:'gray',icon:'🚜'},
    amend:{label:'土壌改良',tag:'teal',icon:'🧱'},
    weed:{label:'除草',tag:'teal',icon:'🌾'},
    pruning:{label:'整枝・誘引',tag:'gray',icon:'✂️'},
    thinning:{label:'摘果・摘花',tag:'gray',icon:'🌸'},
    sideshot:{label:'脇芽かき',tag:'gray',icon:'🌿'},
    repot:{label:'植え替え',tag:'purple',icon:'🪴'},
    event:{label:'生育記録',tag:'gray',icon:'📝'},
    harvest:{label:'収穫',tag:'blue',icon:'🧺'},
    discard:{label:'廃棄・株数調整',tag:'gray',icon:'📊'},
    equip:{label:'資材作業',tag:'gray',icon:'🔧'},
    check:{label:'見回り',tag:'gray',icon:'👁️'},
    other:{label:'その他',tag:'gray',icon:'📝'},
  };
// ─── サクメモ 作業カードの表示ルール（アプリ・みんなのサクメモ共通）───
// 入力した順番に関係なく、作業は下の順番、同じ作業の資材は名前順で表示します。
// ※ public/card-format.js と同じ内容です（片方を変えたらもう片方も変える）
var SK_WORKS = [
  // [値, ラベル, アイコン, 背景色, 文字色]
  ["sow",        "播種",         "🌰", "#dcfce7", "#166534"],
  ["germinated", "発芽確認",     "🌱", "#dcfce7", "#166534"],
  ["transplant", "定植",         "🪴", "#ede9fe", "#5b21b6"],
  ["water",      "水やり",       "💧", "#e0f2fe", "#075985"],
  ["fert",       "施肥",         "🌿", "#d1fae5", "#065f46"],
  ["pest",       "防除",         "🐛", "#fef3c7", "#92400e"],
  ["hormone",    "ホルモン処理", "🧪", "#fae8ff", "#86198f"],
  ["soil",       "土づくり",     "🚜", "#f3f4f6", "#374151"],
  ["amend",      "土壌改良",     "🧱", "#ccfbf1", "#115e59"],
  ["weed",       "除草",         "🌾", "#dcfce7", "#166534"],
  ["pruning",    "整枝・誘引",         "✂️", "#f3f4f6", "#374151"],
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
      add(l.work === "amend" ? "amend" : "fert", fn, fn + (fd && fs ? " " + fd + "倍希釈 散布" + fs + fsu : (fa ? " " + fa + fu : "")) + (fm ? "（" + fm + "）" : ""), "#065f46");
    }
    var pn = skVal(l, "pestName", "pest_name");
    if (pn) {
      var pd = skVal(l, "pestDil", "pest_dil"), pa = skVal(l, "pestAmt", "pest_amt"), pu = skVal(l, "pestUnit", "pest_unit");
      var pt = skVal(l, "pestTarget", "pest_tgt");
      var hz = l.work === "hormone"; // ホルモン処理は防除とは別の作業として表示
      add(hz ? "hormone" : "pest", pn, pn + (pd ? " " + pd + "倍" : "") + (pa ? (hz ? " 使用" : " 散布") + pa + pu : "") + (pt ? (hz ? " 目的:" : " 対象:") + pt : ""), hz ? "#86198f" : "#92400e");
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

const COST_CATS = [
  // 農業経営の主要費目（青色申告帳簿に対応）
  { value:"seed",      label:"🌱 種苗費",           group:"農業費用" },
  { value:"fert",      label:"🌿 肥料費",            group:"農業費用" },
  { value:"pest",      label:"🐛 農薬衛生費",        group:"農業費用" },
  { value:"equip",     label:"🏗️ 農具・資材費",      group:"農業費用" },
  { value:"machine",   label:"🚜 農機具費（修繕含む）",group:"農業費用" },
  { value:"land",      label:"🌾 作付地賃借料",      group:"農業費用" },
  { value:"labor",     label:"👷 雇用労務費",        group:"農業費用" },
  { value:"fuel",      label:"⛽ 燃料費",            group:"農業費用" },
  { value:"water",     label:"💧 水道光熱費",        group:"農業費用" },
  { value:"transport", label:"🚚 荷造運賃",          group:"農業費用" },
  { value:"sales",     label:"🏪 販売費・手数料",    group:"農業費用" },
  { value:"research",  label:"📚 研修・図書費",      group:"農業費用" },
  { value:"comms",     label:"📞 通信費",            group:"農業費用" },
  { value:"insurance", label:"🛡️ 農業保険料",        group:"農業費用" },
  { value:"deprec",    label:"📉 減価償却費",        group:"農業費用" },
  { value:"vehicle",   label:"🚗 車両費（按分）",     group:"農業費用" },
  { value:"other",     label:"📦 その他農業費用",    group:"農業費用" },
  { value:"worker",    label:"👨‍👩‍👧 専従者給与",        group:"農業費用" },
  { value:"owner_loan",label:"💼 事業主借（個人口座から）", group:"資金管理" },
];
const INCOME_CATS = [
  { value:"inc_crop",    label:"🌾 農産物売上",      group:"農業収入" },
  { value:"inc_direct",  label:"🤝 直売・直販",      group:"農業収入" },
  { value:"inc_process", label:"🍱 加工品売上",      group:"農業収入" },
  { value:"inc_misc",    label:"🌿 農業雑収入",      group:"農業収入" },
  { value:"inc_subsidy", label:"💴 補助金・交付金",  group:"農業収入" },
  { value:"inc_other",   label:"📦 その他収入",      group:"農業収入" },
  { value:"inc_owner_draw", label:"💼 事業主貸（個人口座へ）", group:"資金管理" },
];
const isIncome = (cat) => cat && cat.startsWith("inc_");
// 費用内訳バーの色（費目の数だけ用意）
const CAT_BAR_COLORS = ["#4CAF50","#2196F3","#FF9800","#9C27B0","#F44336","#607D8B","#795548","#00BCD4","#CDDC39","#E91E63","#3F51B5","#FFC107","#009688","#8BC34A","#673AB7","#FF5722","#03A9F4","#9E9E9E","#AD1457","#33691E"];
// 元入金：localStorage "motoire" = { "2026": 2027年期首の元入金, ... }（旧形式の数値にも対応）
const readMotoireMap = () => { try{ const raw=localStorage.getItem("motoire"); if(!raw) return {}; const v=JSON.parse(raw); if(typeof v==="number"&&isFinite(v)) return {_legacy:v}; return (v&&typeof v==="object"&&!Array.isArray(v))?v:{}; }catch{ return {}; } };
const getOpeningMotoire = (year) => { const m=readMotoireMap(); const k=String(Number(year)-1); if(m[k]!=null&&isFinite(Number(m[k]))) return Number(m[k]); if(m._legacy!=null&&isFinite(Number(m._legacy))) return Number(m._legacy); return 0; };
const setOpeningMotoire = (year, val) => { try{ const m=readMotoireMap(); delete m._legacy; m[String(Number(year)-1)]=Math.round(Number(val)||0); localStorage.setItem("motoire",JSON.stringify(m)); }catch{} if(typeof syncAppSettings==="function") syncAppSettings(); };
// 品目表示名ヘルパー（カスタム品目対応）
const getCropDisplayName = (c) => {
  if(!c) return "";
  const db = CDB[c.type]||{};
  const name = c.type==="custom" ? (c.customName||"カスタム") : (db.n||c.type);
  return (db.e||"🌱")+" "+name+(c.variety?" ("+c.variety+")":"");
};
const getCropName = (c) => {
  if(!c) return "";
  const db = CDB[c.type]||{};
  return c.type==="custom" ? (c.customName||"カスタム") : (db.n||c.type);
};

// 科の表示順（この順に並べる）
const CAT_ORDER = ["イネ科","タデ科","ナス科","ウリ科","アブラナ科","マメ科","キク科","セリ科","ヒガンバナ科","ショウガ科","サトイモ科","バラ科","アカザ科","シソ科","ヤマノイモ科","その他"];
// 品目リストを科でグループ化してソートするヘルパー
const sortCropsByFamily = (cropList) => {
  return [...cropList].sort((a, b) => {
    const catA = (CDB[a.type]||{}).cat||"その他";
    const catB = (CDB[b.type]||{}).cat||"その他";
    const idxA = CAT_ORDER.indexOf(catA) >= 0 ? CAT_ORDER.indexOf(catA) : 999;
    const idxB = CAT_ORDER.indexOf(catB) >= 0 ? CAT_ORDER.indexOf(catB) : 999;
    if(idxA !== idxB) return idxA - idxB;
    // 同じ科内はCDB定義順（＝登録順）を維持
    return 0;
  });
};
// 品目optionsを生成するヘルパー（ホームのcropGroupsと同じ品目タイプ順グループ化）
const makeCropOptions = (cropList, emptyLabel="（選択）") => {
  const opts = [{value:"",label:emptyLabel}];
  const groups = {};
  const order = [];
  cropList.forEach(c => {
    const db = CDB[c.type]||{};
    const key = c.type==='custom'?(c.customName||'その他'):(db.n||c.type);
    if(!groups[key]){ groups[key]={emoji:db.e||'🌱', crops:[]}; order.push(key); }
    groups[key].crops.push(c);
  });
  order.forEach(key => {
    const g = groups[key];
    g.crops.forEach(c => {
      const label = g.emoji+" "+key+(c.variety?" ("+c.variety+")":"")+(g.crops.length>1&&!c.variety?" #"+(g.crops.indexOf(c)+1):"");
      opts.push({value:c.id, label});
    });
  });
  return opts;
};

const WX_MAP = [[0,"☀️","快晴"],[3,"⛅","晴れ時々くもり"],[48,"🌫️","霧"],[67,"🌧️","雨"],[77,"❄️","雪"],[82,"🌦️","にわか雨"],[99,"⛈️","雷雨"]];
const wxIcon  = c => { for(const [t,i] of WX_MAP) if(c<=t) return i; return "⛈️"; };
const wxLabel = c => { for(const [t,,l] of WX_MAP) if(c<=t) return l; return "雷雨"; };
// weathercode を作業記録の天気カテゴリに変換
const wxToCategory = (code, windspeed) => {
  if(windspeed!==undefined && windspeed>=10) return "windy"; // 強風(10m/s以上)
  if(code===0||code===1) return "sunny";
  if(code===2||code===3||code===45||code===48) return "cloudy";
  if(code>=71&&code<=77) return "snowy";
  if((code>=51&&code<=67)||(code>=80&&code<=99)) return "rainy";
  return "cloudy";
};
const wxAdvice= w => {
  if(!w) return "取得中…";
  if(w.rain>3)  return "☔ 雨天：水やり不要";
  if(w.temp>33) return "高温注意：朝夕に水やりを";
  if(w.temp<8)  return "低温リスク：防寒対策を";
  if(w.wind>35) return "強風注意：支柱確認を";
  return "作業日和";
};

// Utils
const uid0     = () => crypto.randomUUID();

// 単位を正規化して同じ単位に変換（masterUnit基準）
function normalizeToMasterUnit(value, valueUnit, masterUnit) {
  const v = parseFloat(value) || 0;
  const vu = (valueUnit || "").toLowerCase().trim();
  const mu = (masterUnit || "").toLowerCase().trim();
  if(vu === mu) return v; // 同じ単位
  // 重量変換
  if(mu === "kg" && vu === "g")  return v / 1000;
  if(mu === "g"  && vu === "kg") return v * 1000;
  // 容量変換
  if(mu === "l"  && vu === "ml") return v / 1000;
  if(mu === "ml" && vu === "l")  return v * 1000;
  // 変換できない場合はそのまま（単位が一致しないケース）
  return v;
}
// ─── 単位ヘルパー（資材の「内容量の単位」＝在庫の単位にそろえる） ───
const UNIT_BASE = {ml:1, g:1, l:1000, kg:1000};
const unitKey = u => String(u||"").toLowerCase().trim();
// 資材の単位：購入時に記録する内容量の単位（在庫もこの単位で管理）
const masterUnitOf = m => (m && (m.cunit||m.sunit)) || "";
// 同じ種類どうし（容量：L・ml／重さ：kg・g）だけ換算。換算できなければ null
const convertUnitStrict = (v, from, to) => {
  const f=unitKey(from), t=unitKey(to);
  if(f===t) return v;
  const vol=["ml","l"], wt=["g","kg"];
  if((vol.includes(f)&&vol.includes(t)) || (wt.includes(f)&&wt.includes(t))) return v*UNIT_BASE[f]/UNIT_BASE[t];
  return null;
};
// 希釈液（L・ml）から割り出した原液量は、原液が重さ（kg・g）で管理されていても水1L≒1kgとして換算
const convertDilUnit = (v, from, to) => {
  const f=unitKey(from), t=unitKey(to);
  if(UNIT_BASE[f]!=null && UNIT_BASE[t]!=null) return v*UNIT_BASE[f]/UNIT_BASE[t];
  return null;
};
// 単位に合わせた丸め：L・kgは小数4桁（0.1ml・0.1g刻み）、ml・gなどは小数2桁
const roundByUnit = (v, unit) => { const p = ["l","kg"].includes(unitKey(unit)) ? 10000 : 100; return Math.round(v*p)/p; };
// 在庫の単位を内容量の単位にそろえる（古いデータで在庫単位と内容量の単位が違うときだけ換算）
const alignStockUnit = (m) => {
  const cu=m.cunit||"", su=m.sunit||"";
  if(!cu) return m;
  if(!su) return {...m, sunit:cu};
  if(cu===su) return m;
  const v=parseFloat(m.stock);
  if(m.stock===""||m.stock==null||!isFinite(v)) return {...m, sunit:cu};
  let nv = convertUnitStrict(v, su, cu);
  if(nv==null && PACK_UNITS.includes(su) && parseFloat(m.capacity)>0 && !PACK_UNITS.includes(cu)) nv = v*parseFloat(m.capacity);
  if(nv==null) return m;
  return {...m, stock:String(roundByUnit(nv, cu)), sunit:cu};
};
// ─── 希釈計算ヘルパー ───
const isDilMeth = m => m==="液肥希釈"||m==="葉面散布"||m==="かん注";
// 散布量÷希釈倍数＝原液量。資材（masterUnit）が分かればその単位で（Lなら小数も使ってLで）返す
const calcConcentrate = (sprayAmt, dil, sprayUnit, masterUnit) => {
  const s=parseFloat(sprayAmt), d=parseFloat(dil);
  if(!(s>0) || !(d>0)) return null;
  const raw=s/d, su=sprayUnit||"L";
  if(masterUnit){
    const c=convertDilUnit(raw, su, masterUnit);
    if(c!=null) return {amt:roundByUnit(c, masterUnit), unit:masterUnit};
  }
  // 資材が未選択・換算できない単位のとき：読みやすい単位に自動で切り替え
  const u=unitKey(su);
  if(u==="l")  return raw<0.1 ? {amt:Math.round(raw*1000*10)/10, unit:"ml"} : {amt:Math.round(raw*1000)/1000, unit:"L"};
  if(u==="kg") return raw<0.1 ? {amt:Math.round(raw*1000*10)/10, unit:"g"}  : {amt:Math.round(raw*1000)/1000, unit:"kg"};
  return {amt:Math.round(raw*100)/100, unit:su};
};
// ─── 作業記録（施肥・防除）から資材の使用量を計算し、在庫に反映する ───
const PACK_UNITS = ["袋","個","本","箱","缶","瓶","ボトル","パック"];
// 使用量は資材の単位（内容量の単位）で返す。希釈する場合は 散布量÷希釈倍数＝原液量
const logUsageOf = (l, m) => {
  let amt=0, unit="", viaDil=false;
  if(isFertWork(l.work)){
    // 希釈の入力欄が出るのは「液肥希釈・葉面散布・かん注」のときだけ（それ以外に残った希釈の値は使わない）
    if((!l.fertMethod || isDilMeth(l.fertMethod)) && parseFloat(l.fertDil)>0 && parseFloat(l.fertSprayAmt)>0){ amt=parseFloat(l.fertSprayAmt)/parseFloat(l.fertDil); unit=l.fertSprayUnit||"L"; viaDil=true; }
    else if(parseFloat(l.fertAmt)>0){ amt=parseFloat(l.fertAmt); unit=l.fertUnit||""; }
  } else if(isPestWork(l.work)){
    if(parseFloat(l.pestAmt)>0){
      if(parseFloat(l.pestDil)>0){ amt=parseFloat(l.pestAmt)/parseFloat(l.pestDil); viaDil=true; } else amt=parseFloat(l.pestAmt);
      unit=l.pestUnit||"L";
    }
  }
  if(!(amt>0)) return 0;
  const mu = masterUnitOf(m);
  if(viaDil){ const c=convertDilUnit(amt, unit, mu); if(c!=null) return c; }
  if(PACK_UNITS.includes(unit) && parseFloat(m.capacity)>0 && !PACK_UNITS.includes(mu)) return amt*parseFloat(m.capacity); // 1袋＝内容量
  return normalizeToMasterUnit(amt, unit, mu);
};
// { "fert:<id>": 使用量, "pest:<id>": 使用量 }
const stockUsageMap = (entries, fertMs, pestMs) => {
  const map = {};
  (entries||[]).forEach(l=>{
    const kind = isFertWork(l.work)?"fert":isPestWork(l.work)?"pest":null; if(!kind) return;
    const name = kind==="fert"?l.fertName:l.pestName; if(!name) return;
    const m = (kind==="fert"?fertMs:pestMs).find(x=>x.name===name); if(!m) return;
    const u = logUsageOf(l, m); if(!(u>0)) return;
    const k = kind+":"+m.id; map[k]=(map[k]||0)+u;
  });
  return map;
};
const diffUsage = (after, before) => { const d={...after}; Object.entries(before||{}).forEach(([k,v])=>{ d[k]=(d[k]||0)-v; }); return d; };
// delta>0 は使用（在庫を減らす）、delta<0 は戻す。在庫が未登録の資材は変更しない
const applyStockDelta = (delta, { fertMs, setFertMs, pestMs, setPestMs, showToast }) => {
  const fl=[...fertMs], pl=[...pestMs], chF=[], chP=[];
  Object.entries(delta||{}).forEach(([k,d])=>{
    if(!d || Math.abs(d)<1e-9) return;
    const [kind,id]=k.split(":"); const list=kind==="fert"?fl:pl;
    const i=list.findIndex(x=>x.id===id); if(i<0) return;
    const m=list[i]; const cur=parseFloat(m.stock);
    if(m.stock===""||m.stock==null||isNaN(cur)) return;
    if(d>0 && cur<=0) return; // 在庫0（未購入）のまま使った場合は減らさない
    const next=Math.max(0, roundByUnit(cur-d, masterUnitOf(m))); // Lは小数4桁まで（少量の使用も在庫に反映）
    let status=m.status||"使用中";
    if(next<=0 && cur>0){ status="使い切り（非表示）"; showToast&&showToast(m.name+"の在庫がなくなりました"); }
    else if(next>0 && status==="使い切り（非表示）") status="使用中";
    const u={...m, stock:String(next), status};
    list[i]=u; (kind==="fert"?chF:chP).push(u);
  });
  chF.forEach(u=>setFertMs&&setFertMs(fl,u));
  chP.forEach(u=>setPestMs&&setPestMs(pl,u));
};
const daysSince= d => d ? Math.floor((Date.now()-new Date(d))/86400000) : 0;
const fmtDate  = d => (d.getMonth()+1)+"/"+d.getDate();
const localDateStr = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const daysUntil = ds => { if(!ds) return NaN; const [y,m,dd]=String(ds).slice(0,10).split("-").map(Number); const t=new Date(); return Math.round((Date.UTC(y,m-1,dd)-Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()))/86400000); };
const todayStr = () => {const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day;};
const nowTime  = () => new Date().toTimeString().slice(0,5);
// 日付表記の統一: fmtYMD="2026/5/20", fmtMD="5/20"（先頭ゼロなし・スラッシュ区切り）
const fmtYMD = d => { if(!d) return ""; const dt=new Date(d); if(isNaN(dt)) return ""; return dt.getFullYear()+"/"+(dt.getMonth()+1)+"/"+dt.getDate(); };
const fmtMD  = d => { if(!d) return ""; const dt=new Date(d); if(isNaN(dt)) return ""; return (dt.getMonth()+1)+"/"+dt.getDate(); };

async function extractExifDate(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const buf = e.target.result;
        const view = new DataView(buf);
        let offset = 2;
        while(offset < view.byteLength - 4) {
          const marker = view.getUint16(offset);
          if(marker === 0xFFE1) {
            const len = view.getUint16(offset+2);
            const exif = String.fromCharCode(...new Uint8Array(buf, offset+10, Math.min(len,2000)));
            const m = exif.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
            if(m) { resolve({ date:m[1]+"-"+m[2]+"-"+m[3], time:m[4]+":"+m[5] }); return; }
          }
          if(marker === 0xFFDA) break;
          offset += 2 + (view.getUint16(offset+2)||2);
        }
      } catch {}
      resolve(null);
    };
    reader.readAsArrayBuffer(file);
  });
}

async function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      // 品質を調整して400KB以下に
      let quality = 0.75;
      let base64 = canvas.toDataURL("image/jpeg", quality);
      while (base64.length > 150000 && quality > 0.3) {
        quality -= 0.1;
        base64 = canvas.toDataURL("image/jpeg", quality);
      }
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve({ base64, blob });
      }, "image/jpeg", quality);
    };
    img.src = url;
  });
}

// Supabase Storageに写真をアップロードしてURLを返す
async function uploadPhoto(blob, userId, filename) {
  try {
    const path = userId + "/" + filename;
    const { data: uploadData, error } = await sb.storage
      .from("farm-photos")
      .upload(path, blob, { contentType:"image/jpeg", upsert:true });
    if (error) {
      console.error("[uploadPhoto] error:", error.message, error.statusCode, JSON.stringify(error));
      return null;
    }
    const { data } = sb.storage.from("farm-photos").getPublicUrl(path);
    if(!data?.publicUrl) return null; return data.publicUrl+'?t='+Date.now();
  } catch(e) {
    console.error("uploadPhoto exception:", e.message);
    return null;
  }
}

// 住所→緯度経度変換（共通）
async function geocode(addr) {
  let lat=34.9756, lon=138.3827;
  if(addr) {
    try {
      const r=await fetch("https://nominatim.openstreetmap.org/search?q="+encodeURIComponent(addr+" Japan")+"&format=json&limit=1",{headers:{"User-Agent":"FarmAI/1.0"}});
      const d=await r.json(); if(d[0]){lat=parseFloat(d[0].lat);lon=parseFloat(d[0].lon);}
    } catch {}
  }
  return {lat,lon};
}

// 過去気象データ取得（Open-Meteo Archive API）- 日別気温・日照・降水を返す
async function fetchClimateData(addr, startDate, endDate) {
  const {lat,lon} = await geocode(addr);
  try {
    // アーカイブAPIは過去データのみ（今日より前）
    const today = new Date().toISOString().slice(0,10);
    const archiveEnd = endDate < today ? endDate : new Date(Date.now()-86400000).toISOString().slice(0,10);
    let daily=[], archiveDaily=null;

    if(startDate <= archiveEnd) {
      const url="https://archive-api.open-meteo.com/v1/archive"
        +"?latitude="+lat+"&longitude="+lon
        +"&start_date="+startDate+"&end_date="+archiveEnd
        +"&daily=temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum&timezone=Asia%2FTokyo";
      const r=await fetch(url); const d=await r.json();
      archiveDaily=d.daily;
    }

    // 未来分は予報APIから
    let forecastDaily=null;
    if(endDate >= today) {
      const url2="https://api.open-meteo.com/v1/forecast"
        +"?latitude="+lat+"&longitude="+lon
        +"&daily=temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum"
        +"&timezone=Asia%2FTokyo&forecast_days=16";
      const r2=await fetch(url2); const d2=await r2.json();
      forecastDaily=d2.daily;
    }

    // アーカイブと予報を結合
    const mergeDaily=(src)=>{
      if(!src) return;
      src.time.forEach((t,i)=>{
        if(t>=startDate && t<=endDate) {
          daily.push({
            date:t,
            tmax:src.temperature_2m_max?.[i]??null,
            tmin:src.temperature_2m_min?.[i]??null,
            sunshine:(src.sunshine_duration?.[i]||0)/3600,
            precip:src.precipitation_sum?.[i]||0,
            forecast: t>=today,
          });
        }
      });
    };
    mergeDaily(archiveDaily);
    mergeDaily(forecastDaily);
    // 重複除去・日付昇順
    const seen=new Set();
    daily=daily.filter(d=>{if(seen.has(d.date))return false;seen.add(d.date);return true;});
    daily.sort((a,b)=>a.date.localeCompare(b.date));

    // 月別集計
    const monthly={};
    daily.forEach(d=>{
      const ym=d.date.slice(0,7);
      if(!monthly[ym]) monthly[ym]={sunshine:0,precip:0};
      monthly[ym].sunshine+=d.sunshine;
      monthly[ym].precip+=d.precip;
    });
    const monthlyArr=Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0])).map(([ym,v])=>({
      month:ym, sunshine:Math.round(v.sunshine*10)/10, precip:Math.round(v.precip*10)/10,
    }));

    return { daily, monthly: monthlyArr, lat, lon };
  } catch(e) { console.error("fetchClimateData",e); return null; }
}

// 積算温度（GDD）を日別データから計算
// baseTemp: 基準温度（デフォルト10℃）
// startDate: 計算開始日
// daily: [{date,tmax,tmin,...}]
function calcGDD(daily, startDate, baseTemp=10) {
  let gdd=0;
  const result=[];
  daily.filter(d=>d.date>=startDate).forEach(d=>{
    if(d.tmax==null||d.tmin==null){result.push({date:d.date,gdd,daily:0,forecast:d.forecast});return;}
    const avg=(d.tmax+d.tmin)/2;
    const daily=Math.max(0, avg-baseTemp);
    gdd=Math.round((gdd+daily)*10)/10;
    result.push({date:d.date,gdd,daily:Math.round(daily*10)/10,forecast:d.forecast});
  });
  return result;
}

async function fetchWeather(addr) {
  let lat=34.9756, lon=138.3827, label="沼津（デフォルト）";
  if(addr) {
    try {
      const r = await fetch("https://nominatim.openstreetmap.org/search?q="+encodeURIComponent(addr+" Japan")+"&format=json&limit=1", { headers:{"User-Agent":"FarmAI/1.0"} });
      const d = await r.json();
      if(d[0]) { lat=parseFloat(d[0].lat); lon=parseFloat(d[0].lon); label=addr; }
    } catch {}
  }
  try {
    const url = "https://api.open-meteo.com/v1/forecast"
      +"?latitude="+lat+"&longitude="+lon
      +"&current=temperature_2m,weathercode,precipitation,windspeed_10m,relative_humidity_2m"
      +"&hourly=temperature_2m,weathercode,precipitation_probability,precipitation,windspeed_10m"
      +"&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,precipitation_probability_max,sunshine_duration"
      +"&timezone=Asia%2FTokyo&forecast_days=16&wind_speed_unit=ms";
    const r = await fetch(url);
    const d = await r.json();
    const c = d.current;
    // 今日の時間帯別データを抽出（現在時刻から24時間分）
    const now = new Date();
    const nowHour = now.getHours();
    const todayStr = now.toISOString().slice(0,10);
    const hourly = d.hourly;
    // 今日と明日の時間帯インデックスを取得
    const hourSlots = hourly.time.map((t,i)=>({t,i}))
      .filter(({t})=>t>=todayStr+"T"+String(nowHour).padStart(2,"0")+":00")
      .slice(0,24);
    return {
      temp:  Math.round(c.temperature_2m),
      code:  c.weathercode,
      rain:  c.precipitation,
      wind:  Math.round(c.windspeed_10m),
      humid: Math.round(c.relative_humidity_2m),
      daily: d.daily,
      sunshine: (d.daily?.sunshine_duration||[])[0]||null, // 今日の日照時間(秒)
      hourly: hourSlots.map(({t,i})=>({
        hour: new Date(t).getHours(),
        temp: Math.round(hourly.temperature_2m[i]),
        code: hourly.weathercode[i],
        pop:  hourly.precipitation_probability[i]||0,
        rain: hourly.precipitation[i]||0,
      })),
      label
    };
  } catch { return null; }
}

// ============================================================
// STYLES
// ============================================================
// ライトボックス（スライド対応）
(function(){
  var _p=[], _i=0;
  function upd(){
    var img=document.getElementById('_glb_img');
    var cnt=document.getElementById('_glb_cnt');
    if(img) img.src=_p[_i];
    if(cnt) cnt.textContent=_p.length>1?(_i+1)+' / '+_p.length:'';
    ['_glb_prev','_glb_next'].forEach(function(id){
      var b=document.getElementById(id);
      if(b) b.style.display=_p.length>1?'flex':'none';
    });
  }
  window.openLb=function(photos,idx){
    _p=photos; _i=idx;
    var el=document.getElementById('_glb');
    if(!el){
      el=document.createElement('div');
      el.id='_glb';
      el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;';
      // ボタン等をDOMで構築（文字列結合を避ける）
      function mkBtn(txt, css, fn){var b=document.createElement('button');b.textContent=txt;b.style.cssText=css;b.onclick=fn;return b;}
      el.appendChild(mkBtn('‹','position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.15);border:none;color:#fff;width:44px;height:44px;border-radius:50%;font-size:1.5rem;cursor:pointer;',function(e){e.stopPropagation();window._glbPrev();}));
      var img=document.createElement('img');img.id='_glb_img';img.style.cssText='max-width:92vw;max-height:86vh;object-fit:contain;border-radius:8px;user-select:none;';el.appendChild(img);
      el.appendChild(mkBtn('›','position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.15);border:none;color:#fff;width:44px;height:44px;border-radius:50%;font-size:1.5rem;cursor:pointer;',function(e){e.stopPropagation();window._glbNext();}));
      el.appendChild(mkBtn('✕','position:absolute;top:14px;right:14px;background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:1.1rem;cursor:pointer;',function(){el.remove();}));
      var cnt=document.createElement('div');cnt.id='_glb_cnt';cnt.style.cssText='position:absolute;bottom:16px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.7);font-size:.75rem;pointer-events:none;';el.appendChild(cnt);
      el.addEventListener('click',function(e){if(e.target===el)el.remove();});
      document.body.appendChild(el);
    }
    el.style.display='flex';
    upd();
  };
  window._glbPrev=function(){_i=(_i-1+_p.length)%_p.length;upd();};
  window._glbNext=function(){_i=(_i+1)%_p.length;upd();};
})();

const G="#2d6a3f", G2="#419857", G3="#d4edda", GD="#1a4028";
const ALERT="#c0392b", WARN="#e67e22", INFO="#2471a3";
const TX3="#a09070", BD="#e0d9ce";
const TAG_COLORS = { blue:{background:"#dbeafe",color:"#1e40af"}, green:{background:"#d1fae5",color:"#065f46"}, yellow:{background:"#fef3c7",color:"#92400e"}, pink:{background:"#fce7f3",color:"#831843"}, purple:{background:"#ede9fe",color:"#5b21b6"}, gray:{background:"#f3f4f6",color:"#374151"} };
const S = {
  app:   { display:"flex", flexDirection:"column", height:"100dvh", maxWidth:960, margin:"0 auto", background:"#f8f5ef", boxShadow:"0 0 40px rgba(0,0,0,.15)" },
  topbar:{ background:G, color:"#fff", height:52, display:"flex", alignItems:"center", padding:"0 13px", gap:8, flexShrink:0 },
  logo:  { fontFamily:"'Shippori Mincho B1',serif", fontSize:"1.1rem", letterSpacing:".06em" },
  tbBtn: { background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.25)", color:"#fff", borderRadius:8, padding:"5px 10px", fontSize:".72rem", cursor:"pointer", flexShrink:0 },
  main:  { flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" },
  scr:   { padding:"12px 12px calc(90px + env(safe-area-inset-bottom))" },
  bnav:  { background:GD, display:"flex", borderTop:"1px solid rgba(255,255,255,.08)", flexShrink:0, height:"calc(58px + env(safe-area-inset-bottom))", paddingBottom:"env(safe-area-inset-bottom)", boxSizing:"border-box" },
  bBtn:  { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, background:"none", border:"none", color:"rgba(255,255,255,.33)", fontSize:".52rem", cursor:"pointer", minWidth:0 },
  bBtnOn:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, background:"none", border:"none", color:"#9ffcb4", fontSize:".52rem", cursor:"pointer", minWidth:0 },
  card:  { background:"#fff", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,.08)", padding:13, marginBottom:9, border:"1px solid "+BD },
  sec:   { fontFamily:"'Shippori Mincho B1',serif", fontSize:".9rem", color:"#5c3d1e", margin:"14px 0 7px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  secBtn:{ fontSize:".68rem", fontWeight:700, color:G, background:G3, border:"none", borderRadius:999, padding:"3px 9px", cursor:"pointer" },
  fg:    { marginBottom:9 },
  lbl:   { display:"block", fontSize:".72rem", fontWeight:700, color:"#5c3d1e", marginBottom:3 },
  inp:   { width:"100%", padding:"7px 10px", border:"1.5px solid "+BD, borderRadius:8, fontSize:".86rem", outline:"none", background:"#fff", WebkitAppearance:"none" },
  btn:   { padding:"9px 14px", border:"none", borderRadius:10, fontSize:".85rem", fontWeight:700, width:"100%", display:"block", textAlign:"center", cursor:"pointer" },
  btnG:  { background:G, color:"#fff" },
  btnR:  { background:ALERT, color:"#fff" },
  btnS:  { background:"#fff", color:G, border:"1.5px solid "+G },
  btnI:  { background:INFO, color:"#fff" },
  btnSm: { padding:"4px 10px", fontSize:".7rem", borderRadius:8, width:"auto", display:"inline-block" },
  li:    { display:"flex", alignItems:"center", gap:8, padding:"9px 11px", background:"#fff", border:"1px solid "+BD, borderRadius:10, marginBottom:6 },
  tag:   { display:"inline-flex", alignItems:"center", gap:2, fontSize:".66rem", fontWeight:700, padding:"2px 6px", borderRadius:999, whiteSpace:"nowrap" },
};
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&family=Shippori+Mincho+B1:wght@400;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html,body{font-family:'BIZ UDGothic',sans-serif;background:#f8f5ef;color:#1c1a14;overflow-x:hidden;max-width:100%;}
  img,table{max-width:100%;}
  button,input,select,textarea{font-family:inherit;}
  input,select,textarea{font-size:16px!important;}
  /* ライトボックス以外ではピンチ拡大を防止 */
  body{touch-action:pan-x pan-y;}
  .lb-open{touch-action:pinch-zoom;}
  /* スマホ: 下部ナビに隠れないよう十分な余白 */
  .scr-inner{padding-bottom:calc(90px + env(safe-area-inset-bottom));}
  @media(min-width:900px){
    #bot-nav{display:none!important;}
    #pc-nav{display:flex!important;}
    #main-scroll{height:calc(100svh - 52px - 44px);overflow-y:auto;scrollbar-width:none;}
    #main-scroll::-webkit-scrollbar{display:none;}
    .scr-inner{padding-bottom:20px!important;}
    .app-modal{top:96px!important;}
  }
  .app-modal{top:52px;}
  /* ガントバーのドラッグ中に文字が選択されないように */
  .gantt-bar,.gantt-bar *{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-touch-callout:none;}
  .no-select{user-select:none;-webkit-user-select:none;}
`;

// Small components
function Tag({ type, children }) { return <span style={{...S.tag,...(TAG_COLORS[type]||TAG_COLORS.gray)}}>{children}</span>; }

// 農業用語辞典
const AGRI_TERMS = {
  "播種":       {read:"はしゅ",           desc:"種を土にまくこと"},
  "直まき":     {read:"じかまき",         desc:"畑やプランターに直接種をまくこと"},
  "育苗":       {read:"いくびょう",       desc:"種から苗を育てること。本畑に植える前の準備"},
  "発芽確認":   {read:"はつがかくにん",   desc:"種をまいてから芽が出たことを確認すること"},
  "発芽率":     {read:"はつがりつ",       desc:"種をまいた数に対して発芽した割合"},
  "定植":       {read:"ていしょく",       desc:"苗を畑やプランターに植えること"},
  "水やり":     {read:"みずやり",         desc:"植物に水を与えること"},
  "施肥":       {read:"せひ",             desc:"肥料を与えること。元肥・追肥などがある"},
  "追肥":       {read:"ついひ",           desc:"育てている途中に肥料を与えること"},
  "元肥":       {read:"もとごえ",         desc:"植え付け前に土に混ぜておく肥料"},
  "防除":       {read:"ぼうじょ",         desc:"病気や害虫から作物を守る作業。農薬散布など"},
  "剪定":       {read:"せんてい",         desc:"樹木の枝を切り整えること。風通しや日当たりを良くする"},
  "摘心":       {read:"てきしん",         desc:"先端の芽を摘むこと。草丈を抑え脇芽を増やす"},
  "摘果・摘花": {read:"てきか・てきか",   desc:"余分な実や花を取り除くこと。残した実を大きくする"},
  "摘果":       {read:"てきか",           desc:"余分な実を取り除くこと。残した実を大きくする"},
  "摘花":       {read:"てきか",           desc:"余分な花を取り除くこと"},
  "脇芽かき":   {read:"わきめかき",       desc:"脇から出た芽を取り除くこと。養分を主枝に集中させる"},
  "生育記録":   {read:"せいいくきろく",   desc:"開花・着果など生育の節目を記録すること"},
  "収穫":       {read:"しゅうかく",       desc:"育てた作物を取り入れること"},
  "廃棄・株調整":{read:"はいき・かぶちょうせい",desc:"枯れた株の除去や株数の調整をすること"},
  "資材作業":   {read:"しざいさぎょう",   desc:"マルチや支柱など農業資材の設置・撤去作業"},
  "見回り":     {read:"みまわり",         desc:"圃場を巡回して生育状況や異常を確認すること"},
  "その他":     {read:"そのた",           desc:"上記以外の農作業全般"},
  "中耕":       {read:"ちゅうこう",       desc:"育てている途中に土を耕すこと"},
  "土寄せ":     {read:"どよせ",           desc:"株元に土を寄せること"},
  "間引き":     {read:"まびき",           desc:"密集した苗を抜いて間隔を広げること"},
  "誘引":       {read:"ゆういん",         desc:"茎や枝を支柱に結びつけること"},
  "連作":       {read:"れんさく",         desc:"同じ場所に同じ作物を続けて栽培すること"},
  "輪作":       {read:"りんさく",         desc:"同じ場所に異なる作物を順番に栽培すること"},
  "休閑":       {read:"きゅうかん",       desc:"畑を休ませること"},
  "堆肥":       {read:"たいひ",           desc:"有機物を発酵させた肥料"},
  "緑肥":       {read:"りょくひ",         desc:"土に混ぜ込む植物"},
  "草丈":       {read:"くさたけ",         desc:"地面から植物の先端までの高さ"},
  "分げつ":     {read:"ぶんげつ",         desc:"イネ科の植物で茎が枝分かれすること"},
  "植え替え":   {read:"うえかえ",          desc:"植物を大きな鉢や別の場所に移し替えること"},
  "鉢植え":     {read:"はちうえ",          desc:"鉢やプランターで植物を育てること"},
};

function TermTooltip({ children }) {
  const [show, setShow] = useState(false);
  const term = AGRI_TERMS[children];
  if(!term) return <span>{children}</span>;
  return (
    <span style={{position:"relative",display:"inline-block"}}
      onMouseEnter={()=>setShow(true)}
      onMouseLeave={()=>setShow(false)}
      onTouchStart={()=>setShow(true)}
      onTouchEnd={()=>setTimeout(()=>setShow(false),1500)}>
      <span style={{borderBottom:"1px dashed "+G,color:G,cursor:"help",fontWeight:700}}>
        {children}
      </span>
      {show&&(
        <span style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#1c1a14",color:"#fff",borderRadius:9,padding:"8px 12px",fontSize:".74rem",whiteSpace:"nowrap",boxShadow:"0 4px 16px rgba(0,0,0,.3)",minWidth:200,lineHeight:1.7,pointerEvents:"none"}}>
          <span style={{color:"#9ffcb4",fontWeight:700}}>{children}</span>
          <span style={{color:"#aaa",fontSize:".68rem",marginLeft:5}}>（{term.read}）</span>
          <br/>{term.desc}
          <span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1c1a14"}}/>
        </span>
      )}
    </span>
  );
}
function Btn({ onClick, onTouchEnd, style, disabled, children }) { return <button onClick={onClick} onTouchEnd={onTouchEnd} disabled={disabled} style={{...S.btn,...style,opacity:disabled?.5:1,cursor:disabled?"not-allowed":"pointer"}}>{children}</button>; }
function FG({ label, children }) { return <div style={S.fg}>{label&&<label style={S.lbl}>{label}</label>}{children}</div>; }
function Inp({ value, onChange, type="text", placeholder="", style={}, ...props }) {
  const imode = type==="number"?"decimal":type==="tel"?"tel":"text";
  return <input type={type} value={value||""} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} style={{...S.inp,...style}}
    inputMode={imode}
    {...(type!=="number"?{lang:"ja"}:{})}
    {...props} />;
}

// 計算機キーボード付き数値入力（PC・スマホ共通：クリックで計算機、PCはキー入力も可）
function CalcInp({ value, onChange, placeholder="0", style={} }) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");
  const [display, setDisplay] = useState("");
  const inputRef = useRef(null);

  const evalExpr = (e) => {
    const safe = e.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/＋/g,"+").replace(/[^0-9+\-*/.()]/g,"");
    if(!safe) return null;
    try {
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict";return ('+safe+')')();
      if(!isFinite(result)) return null;
      return Math.round(result * 100) / 100;
    } catch { return null; }
  };

  const openCalc = () => {
    setExpr(value ? String(value) : "");
    setDisplay(value ? String(value) : "");
    setOpen(true);
  };

  const pressKey = (k) => {
    if(k === "AC") { setExpr(""); setDisplay(""); onChange(""); setOpen(false); return; }
    if(k === "⌫") { const ne=expr.slice(0,-1); setExpr(ne); setDisplay(ne); return; }
    if(k === "＝") {
      const r = evalExpr(expr);
      if(r===null) { setDisplay("エラー"); setExpr(""); return; }
      const s = String(r); setExpr(s); setDisplay(s); onChange(s); return;
    }
    const ne = expr + k; setExpr(ne); setDisplay(ne);
  };

  const confirm = () => {
    const r = evalExpr(expr);
    if(r!==null) onChange(String(r));
    else if(!expr) onChange("");
    setOpen(false);
  };

  // PCキーボード入力ハンドラ（計算機が開いているとき）
  const handleKeyDown = (e) => {
    if(!open) return;
    e.preventDefault();
    const k = e.key;
    if(k>="0"&&k<="9") pressKey(k);
    else if(k===".") pressKey(".");
    else if(k==="+" ) pressKey("＋");
    else if(k==="-" ) pressKey("−");
    else if(k==="*" ) pressKey("×");
    else if(k==="/" ) pressKey("÷");
    else if(k==="Enter"||k==="=") confirm();
    else if(k==="Backspace") pressKey("⌫");
    else if(k==="Escape") { setOpen(false); }
  };

  const keys = [
    ["7","8","9","×"],
    ["4","5","6","−"],
    ["1","2","3","＋"],
    [".","0","⌫","＝"],
  ];

  return <>
    <input
      ref={inputRef}
      type="text"
      inputMode="none"
      readOnly
      value={value||""}
      placeholder={placeholder}
      onClick={openCalc}
      onKeyDown={handleKeyDown}
      style={{...S.inp,...style,cursor:"pointer",background:"#fffdf8"}}
    />
    {open && <div
      style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:10000,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
      onClick={e=>{if(e.target===e.currentTarget)confirm();}}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div style={{background:"#f8f5ef",borderRadius:"16px 16px 0 0",padding:"12px 16px 0",boxShadow:"0 -4px 24px rgba(0,0,0,.18)",
        paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 68px)"}}>
        {/* ディスプレイ行 */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <div style={{flex:1,background:"#fff",borderRadius:10,padding:"8px 12px",fontSize:"1.2rem",fontWeight:700,color:"#5c3d1e",
            minHeight:44,textAlign:"right",border:"1.5px solid #e0d9ce",overflowX:"auto",whiteSpace:"nowrap"}}>
            {display||<span style={{color:"#bbb",fontWeight:400,fontSize:".9rem"}}>{placeholder}</span>}
          </div>
          <button onClick={confirm}
            style={{padding:"8px 18px",borderRadius:10,border:"none",background:"#2d6a3f",color:"#fff",fontSize:".9rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>
            完了
          </button>
        </div>
        {/* PCキーボード入力ヒント */}
        <div style={{fontSize:".68rem",color:"#aaa",textAlign:"right",marginBottom:8}}>
          💡 キーボード入力・演算子(+ - * /)→Enter で確定
        </div>
        {/* AC + ÷ */}
        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:8,marginBottom:8}}>
          <button onClick={()=>pressKey("AC")}
            style={{padding:"13px 0",borderRadius:12,border:"none",fontSize:"1rem",fontWeight:700,cursor:"pointer",background:"#fde8e8",color:"#c0392b",boxShadow:"0 2px 6px rgba(0,0,0,.08)"}}>
            クリア
          </button>
          <button onClick={()=>pressKey("÷")}
            style={{padding:"13px 0",borderRadius:12,border:"none",fontSize:"1.2rem",fontWeight:700,cursor:"pointer",background:"#f5efe0",color:"#8B6914",boxShadow:"0 2px 6px rgba(0,0,0,.08)"}}>
            ÷
          </button>
        </div>
        {/* キーパッド 4×4 */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {keys.flat().map(k=>{
            const isOp=["×","−","＋"].includes(k);
            const isEq=k==="＝";
            const isDel=k==="⌫";
            return <button key={k} onClick={()=>isEq?confirm():pressKey(k)}
              style={{padding:"16px 0",borderRadius:12,border:"none",fontSize:"1.2rem",fontWeight:700,cursor:"pointer",
                background:isEq?"#2d6a3f":isOp?"#f5efe0":isDel?"#fde8e8":"#fff",
                color:isEq?"#fff":isOp?"#8B6914":isDel?"#c0392b":"#3c3228",
                boxShadow:"0 2px 6px rgba(0,0,0,.08)"}}>
              {k}
            </button>;
          })}
        </div>
      </div>
    </div>}
  </>;
}
function Sel({ value, onChange, options, style={} }) { const selV = (value===0 || (value && value!==-1)) ? String(value) : ""; /* 0番目（先頭）の資材も選択状態にする */ return <select value={selV} onChange={e=>{ if(!options.find(o=>o.value===e.target.value)?.disabled) onChange(e.target.value); }} style={{...S.inp,...style}}>{options.map(o=><option key={o.value} value={o.value} disabled={o.disabled} style={o.disabled?{color:"#aaa",fontWeight:700,background:"#f5f5f0"}:{}}>{o.label}</option>)}</select>; }
function TA({ value, onChange, placeholder="" }) { return <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...S.inp,minHeight:65,resize:"vertical",lineHeight:1.5}} />; }
function R2({ children }) { return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{children}</div>; }
function R3({ children }) { return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>{children}</div>; }
function Prog({ pct }) { return <div style={{height:5,background:"#eee",borderRadius:999,overflow:"hidden",marginTop:6}}><div style={{height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+G+","+G2+")",width:pct+"%",transition:"width .7s ease"}} /></div>; }
function Toast({ msg }) { if(!msg) return null; return <div style={{position:"fixed",bottom:66,left:"50%",transform:"translateX(-50%)",background:"#1c1a14",color:"#fff",padding:"6px 15px",borderRadius:999,fontSize:".78rem",zIndex:700,whiteSpace:"nowrap",pointerEvents:"none"}}>{msg}</div>; }

function Modal({ open, onClose, title, children }) {
  if(!open) return null;
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.48)",zIndex:1000,display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center"}}>
      <div style={{background:"#f8f5ef",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:960,display:"flex",flexDirection:"column",maxHeight:"calc(100svh - 60px)"}}>
        <div style={{padding:"15px 13px 12px",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e0d9ce"}}>
          <span style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".98rem"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.25rem",color:"#aaa",cursor:"pointer",lineHeight:1}}>✕</button>
        </div>
        <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"13px 13px 0"}}>
          {children}
        </div>
        <div style={{padding:"12px 13px",paddingBottom:"max(12px, env(safe-area-inset-bottom))",flexShrink:0,background:"#f8f5ef"}}>
          <div id="modal-save-btn-portal" />
        </div>
      </div>
    </div>
  );
}

// Modal with a sticky save button always visible at bottom
function ModalWithSave({ open, onClose, title, onSave, saveLabel="保存", children }) {
  useEffect(()=>{
    if(!open) return;
    const onKey = e => {
      // ESC → 閉じる
      if(e.key==="Escape"){ e.preventDefault(); onClose(); return; }
      // Shift+S → 保存（テキスト入力中は除外）
      if(e.shiftKey && e.key==="S"){
        const tag = document.activeElement?.tagName;
        if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
        e.preventDefault(); onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[open, onClose, onSave]);

  if(!open) return null;
  return (
    <div className="app-modal" style={{position:"fixed",left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:960,bottom:0,zIndex:9999,display:"flex",flexDirection:"column",background:"#f8f5ef"}}>
      <div style={{background:GD,color:"#fff",padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:8}}>
        <span style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".92rem",fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
        <button onClick={onClose} title="閉じる (ESC)" style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:".8rem",cursor:"pointer",flexShrink:0,minWidth:40,minHeight:40}}>✕</button>
        <button onClick={onSave} title="保存 (Shift+S)" style={{background:"#fff",border:"none",color:G,borderRadius:8,padding:"6px 14px",fontSize:".8rem",fontWeight:700,cursor:"pointer",flexShrink:0,minWidth:60,minHeight:40}}>{saveLabel} ✓</button>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"14px 14px 0",paddingBottom:"calc(58px + env(safe-area-inset-bottom, 0px) + 24px)"}}>
        {children}
      </div>
    </div>
  );
}

// LOGIN
function SetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [done,     setDone]     = useState(false);

  const submit = async () => {
    if(!password || password.length < 6) { setErr("パスワードは6文字以上で設定してください"); return; }
    if(password !== confirm) { setErr("パスワードが一致しません"); return; }
    setLoading(true); setErr("");
    const { error } = await sb.auth.updateUser({ password });
    if(error) { setErr(error.message); setLoading(false); return; }
    // セッションをクリアしてログイン画面に戻す
    await sb.auth.signOut();
    window.history.replaceState(null, '', window.location.pathname);
    setDone(true);
    setTimeout(() => onDone(), 2500);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100svh",background:"linear-gradient(135deg,"+GD+","+G+")",padding:20}}>
      <style>{globalCss}</style>
      <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:8}}>🌾</div>
        <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:"1.3rem",color:G,marginBottom:4}}>サクメモ</div>
        {done ? (
          <div style={{padding:"20px 0"}}>
            <div style={{fontSize:"2rem",marginBottom:12}}>✅</div>
            <div style={{fontWeight:700,marginBottom:8}}>パスワードを設定しました</div>
            <div style={{fontSize:".8rem",color:TX3}}>ログイン画面に移動します…</div>
          </div>
        ) : (
          <>
            <div style={{fontSize:".86rem",fontWeight:700,marginBottom:4}}>パスワードを設定してください</div>
            <div style={{fontSize:".76rem",color:TX3,marginBottom:20}}>招待いただいたアカウントのパスワードを設定します</div>
            <div style={{textAlign:"left",marginBottom:12}}>
              <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>パスワード（6文字以上）</div>
              <div style={{position:"relative"}}>
                <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="パスワードを設定" autoComplete="new-password" id="new-password"
                  style={{width:"100%",padding:"9px 36px 9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:"16px",fontFamily:"inherit",outline:"none"}}/>
                <button type="button" onClick={()=>setShowPw(p=>!p)}
                  style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:".8rem",color:"#888"}}>
                  {showPw?"🙈":"👁"}
                </button>
              </div>
            </div>
            <div style={{textAlign:"left",marginBottom:16}}>
              <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>パスワード（確認）</div>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="もう一度入力"
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:"16px",fontFamily:"inherit",outline:"none"}}/>
            </div>
            {err&&<div style={{color:ALERT,fontSize:".78rem",marginBottom:12}}>{err}</div>}
            <button onClick={submit} disabled={loading}
              style={{width:"100%",padding:"12px",background:loading?"#ccc":G,color:"#fff",border:"none",borderRadius:12,fontSize:".88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {loading?"設定中…":"パスワードを設定してログイン"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen() {
  const [mode,    setMode]    = useState("login");
  const [email,   setEmail]   = useState("");
  const [password,setPassword]= useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  const loginEmail = async () => {
    if(!email||!password){setErr("メールとパスワードを入力してください");return;}
    setLoading(true);setErr("");
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){setErr(error.message.includes("Invalid")?"メールまたはパスワードが違います":error.message);setLoading(false);}
  };



  const resetPw = async () => {
    if(!email){setErr("メールアドレスを入力してください");return;}
    setLoading(true);setErr("");
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    setErr(error?error.message:"✅ パスワードリセットメールを送信しました");
    setLoading(false);
  };

  const linkErr = window.__linkError || "";
  if(linkErr) { window.__linkError = null; }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100svh",background:"linear-gradient(135deg,"+GD+","+G+")",padding:20}}>
      <style>{globalCss}</style>
      <div style={{background:"#fff",borderRadius:20,padding:"28px 24px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:6}}>🌾</div>
        <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:"1.3rem",color:G,marginBottom:4}}>サクメモ</div>
        <div style={{fontSize:".76rem",color:TX3,marginBottom:20}}>作物の記録アプリ <span style={{opacity:.5}}>v2.2.11</span></div>
        {linkErr&&<div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"10px 12px",marginBottom:16,fontSize:".78rem",color:"#856404",textAlign:"left"}}>{linkErr}</div>}



        {mode==="login"&&<div style={{textAlign:"left"}}>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>メールアドレス</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="example@gmail.com" autoComplete="email"
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:"16px",fontFamily:"inherit",outline:"none"}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>パスワード</div>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="パスワード" autoComplete="current-password"
                style={{width:"100%",padding:"9px 36px 9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:"16px",fontFamily:"inherit",outline:"none"}}/>
              <button type="button" onClick={()=>setShowPw(p=>!p)}
                style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:".8rem",color:"#888"}}>
                {showPw?"🙈":"👁"}
              </button>
            </div>
          </div>
          <button onClick={loginEmail} disabled={loading}
            style={{width:"100%",padding:"11px",background:loading?"#ccc":G,color:"#fff",border:"none",borderRadius:12,fontSize:".9rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
            {loading?"ログイン中…":"ログイン"}
          </button>
          {err&&<div style={{color:"#e74c3c",fontSize:".78rem",marginBottom:8,textAlign:"center"}}>{err}</div>}
          <button onClick={()=>{setMode("reset");setErr("");}}
            style={{background:"none",border:"none",color:TX3,fontSize:".74rem",cursor:"pointer",fontFamily:"inherit",display:"block",margin:"0 auto"}}>
            パスワードを忘れた方
          </button>
        </div>}



        {mode==="reset"&&<div style={{textAlign:"left"}}>
          <div style={{fontSize:".8rem",color:TX3,marginBottom:12,textAlign:"center"}}>登録メールにリセット用リンクを送ります</div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>メールアドレス</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="example@gmail.com" autoComplete="email"
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:"16px",fontFamily:"inherit",outline:"none"}}/>
          </div>
          <button onClick={resetPw} disabled={loading}
            style={{width:"100%",padding:"11px",background:loading?"#ccc":G,color:"#fff",border:"none",borderRadius:12,fontSize:".9rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
            {loading?"送信中…":"リセットメールを送信"}
          </button>
          {err&&<div style={{color:err.includes("✅")?"#2d6a3f":"#e74c3c",fontSize:".78rem",marginBottom:8,textAlign:"center"}}>{err}</div>}
          <button onClick={()=>{setMode("login");setErr("");}}
            style={{background:"none",border:"none",color:TX3,fontSize:".74rem",cursor:"pointer",fontFamily:"inherit",display:"block",margin:"0 auto"}}>
            ← ログイン画面に戻る
          </button>
        </div>}

        <div style={{fontSize:".66rem",color:"#a09070",marginTop:16,lineHeight:1.6}}>
          <a href="https://sakumemo-1.vercel.app/privacy-policy.html" target="_blank" style={{color:G}}>プライバシーポリシー</a>・
          <a href="https://sakumemo-1.vercel.app/terms-of-service.html" target="_blank" style={{color:G}}>利用規約</a>
        </div>
        <div style={{fontSize:".62rem",color:"#ccc",marginTop:8}}>v2.2.11</div>
      </div>
    </div>
  );
}

function HomeScreen({ fields, crops, setCrops, logs, setLogs, costs, onEditCrop, showToast, setScr, onNew, dbLoad, dbSaveLog, dbDelete }) {
  const [reminderMode, setReminderMode] = useState("both"); // "auto"|"custom"|"both"
  const [mSched, setMSched] = useState(null); // カスタム予定モーダル {date,title,cropId,id}
  // 自動リマインダーの非表示リスト（key→true）、localStorageで永続化
  const [dismissedAuto, setDismissedAuto] = useState(()=>{
    try{return JSON.parse(localStorage.getItem('sakumemo_dismissed_auto')||'{}');}catch{return{};}
  });
  const dismissAutoItem = (key) => {
    const next={...dismissedAuto,[key]:true};
    setDismissedAuto(next);
    try{localStorage.setItem('sakumemo_dismissed_auto',JSON.stringify(next));}catch{}
  };
  // カスタム予定（work="schedule"のlogs）
  const schedules = logs.filter(l=>l.work==="schedule").sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  const saveSchedule = () => {
    if(!mSched.title){showToast("タイトルを入力してください");return;}
    const item = {id:mSched.id||uid0(), _groupId:null, fieldIdx:0, cropId:mSched.cropId||"",
      work:"schedule", memo:mSched.title, date:mSched.date||todayStr(), time:"", duration:"",
      imgSrc:null,imgSrc2:null,imgSrc3:null};
    if(mSched.id){
      setLogs(logs.map(l=>l.id===mSched.id?item:l)); dbSaveLog(item);
    } else {
      setLogs([...logs,item]); dbSaveLog(item);
    }
    setMSched(null); showToast("予定を保存しました");
  };
  const deleteSchedule = (id) => {
    if(!window.confirm("削除しますか？"))return;
    setLogs(logs.filter(l=>l.id!==id)); dbDelete("logs",id);
    showToast("削除しました");
  };
  // 作業リマインダー: 栽培中の品目について追肥時期・収穫時期を提案
  const reminders = (()=>{
    const out=[];
    const today=new Date(); today.setHours(0,0,0,0);
    const fmtFuture=(d)=>{const dd=Math.round((d-today)/86400000);if(dd===0)return"今日";if(dd===1)return"明日";if(dd<0)return`${-dd}日前`;return`${dd}日後`;};
    crops.filter(c=>!c.ended&&(c.reminderMode||"auto")==="auto").forEach(c=>{
      const db=CDB[c.type]||{};
      const cropLabel=getCropDisplayName(c);

      // ── 定植予定（育苗後定植で、播種済み・未定植の品目）──
      if(c.cultivationType==="nursery" && c.sowDate && !c.plantDate){
        const sowD=new Date(c.sowDate); sowD.setHours(0,0,0,0);
        const nDays=NURSERY_DAYS[c.type]||30;
        const transplantD=new Date(sowD); transplantD.setDate(transplantD.getDate()+nDays);
        const toTransplant=Math.round((transplantD-today)/86400000);
        if(toTransplant<=21){ // 3週間先〜過ぎたものまで表示
          out.push({crop:c, label:cropLabel, type:"transplant", date:transplantD,
            msg:toTransplant>0?`定植予定 ${fmtFuture(transplantD)}`:`定植適期です（予定から${-toTransplant}日経過）`,
            urgent:toTransplant<=3&&toTransplant>=-7, sortD:transplantD});
        }
        return; // 育苗中は他のリマインダー（追肥・収穫）は出さない
      }

      const start=c.plantDate||c.sowDate;
      if(!start) return;
      const startD=new Date(start); startD.setHours(0,0,0,0);
      const days=Math.floor((today-startD)/86400000);
      if(days<0) return; // まだ植えていない

      // ── 収穫予定（今後の予定として）──
      const mat=parseInt(c.harvestDays)||db.maturity?.[c.maturity||"mid"]||db.d||90; // カスタム熟期日数を優先
      const harvestD=new Date(startD); harvestD.setDate(harvestD.getDate()+mat);
      const toHarvest=Math.round((harvestD-today)/86400000);
      // 既に収穫ログがあれば収穫リマインダーは出さない
      const hasHarvest=logs.some(l=>l.cropId===c.id&&l.work==="harvest");
      if(!hasHarvest && toHarvest>=-14 && toHarvest<=30){
        out.push({crop:c, label:cropLabel, type:"harvest", date:harvestD,
          msg:toHarvest>0?`収穫予定 ${fmtFuture(harvestD)}`:`収穫適期（予定から${-toHarvest}日経過）`, urgent:toHarvest<=3&&toHarvest>=-7, sortD:harvestD});
      }

      // ── 追肥予定（次回の予定日を計算）──
      // 間隔: 品目個別設定(fertInterval) > 標準テーブル(FERT_INTERVAL) の順。0なら追肥リマインダーなし
      const interval = (c.fertInterval!==undefined&&c.fertInterval!=="")?parseInt(c.fertInterval):(FERT_INTERVAL[c.type]!==undefined?FERT_INTERVAL[c.type]:21);
      const needChase = interval>0;
      if(needChase){
        const fertLogs=logs.filter(l=>l.cropId===c.id&&l.work==="fert").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
        const lastFert=fertLogs[0];
        // 次の追肥予定日: 最後の追肥/スキップから interval 日後、まだなら定植 interval 日後
        let baseD;
        const skipD = c.fertSkipDate?new Date(c.fertSkipDate):null;
        if(skipD) skipD.setHours(0,0,0,0);
        if(lastFert){ baseD=new Date(lastFert.date); baseD.setHours(0,0,0,0); }
        else { baseD=new Date(startD); }
        // スキップ日が最後の追肥より後なら、スキップ日を基準に
        if(skipD && (!lastFert || skipD>baseD)) baseD=skipD;
        let nextFertD=new Date(baseD); nextFertD.setDate(nextFertD.getDate()+interval);
        const toFert=Math.round((nextFertD-today)/86400000);
        // 予定日が近い or 過ぎている（14日先〜7日前まで表示）。収穫期を過ぎたものは除外
        if(toFert<=14 && toFert>=-14 && toHarvest>3){
          out.push({crop:c, label:cropLabel, type:"fert", date:nextFertD,
            msg:toFert>0?`追肥予定 ${fmtFuture(nextFertD)}`:`追肥時期（予定から${-toFert}日経過）`, urgent:false, sortD:nextFertD});
        }
      }
    });
    // 予定日が早い順
    // カスタムリマインダー（customEventsを持つ品目）
    const today2=new Date(); today2.setHours(0,0,0,0);
    crops.filter(c=>!c.ended&&(c.reminderMode||"auto")==="custom").forEach(c=>{
      const db=CDB[c.type]||{};
      const cropLabel=getCropDisplayName(c);
      (c.customEvents||[]).forEach(ev=>{
        if(!ev.date||ev.done) return;
        const evD=new Date(ev.date); evD.setHours(0,0,0,0);
        const dd=Math.round((evD-today2)/86400000);
        if(dd<-1) return; // 昨日以前は非表示
        const typeIcon=ev.type==="harvest"?"🧺":ev.type==="fert"?"🌿":ev.type==="pest"?"🐛":"📌";
        out.push({crop:c, cropId:c.id, label:cropLabel, type:ev.type||"work", date:evD,
          msg:ev.title||"作業予定", icon:typeIcon, isCustom:true, evIdx:(c.customEvents||[]).indexOf(ev),
          urgent:dd<=1&&dd>=-1, sortD:evD, dateStr:ev.date});
      });
    });
    return out.sort((a,b)=>a.sortD-b.sortD);
  })();

  // shownItems: 表示モードに応じたリマインダー一覧（日付順）
  const today0s = new Date(); today0s.setHours(0,0,0,0);
  const fmtDayStr = d => { const dd=Math.round((new Date(d)-today0s)/86400000); if(dd===0)return"今日"; if(dd===1)return"明日"; if(dd<0)return`${-dd}日前`; return`${dd}日後`; };
  // 自動リマインダー（remindersのisCustomでないもの）
  const autoItems = reminders.filter(r=>!r.isCustom).filter(r=>{const k="auto_"+(r.crop?.id||"")+"_"+r.type+"_";return !dismissedAuto[k+localDateStr(r.sortD)] && !dismissedAuto[k+r.sortD.toISOString().slice(0,10)];}).map(r=>({
    key:"auto_"+(r.crop?.id||"")+"_"+r.type+"_"+localDateStr(r.sortD),
    isCustom:false, isCropEvent:false,
    sortD:r.sortD, urgent:r.urgent,
    icon:r.type==="harvest"?"🧺":r.type==="fert"?"🌿":r.type==="transplant"?"🪴":"📋",
    label:r.label, msg:r.msg,
    dateStr:localDateStr(r.sortD),
    dayStr:fmtDayStr(localDateStr(r.sortD)),
    crop:r.crop
  }));
  // カスタムリマインダー（customEventsとschedules）
  const customItems = [
    ...reminders.filter(r=>r.isCustom).map(r=>({
      key:"cust_"+(r.crop?.id||"")+"_"+(r.evIdx||0)+"_"+(r.dateStr||""),
      isCustom:true, isCropEvent:true,
      sortD:r.sortD, urgent:r.urgent,
      icon:r.icon||"📌",
      label:r.label, msg:r.msg,
      dateStr:r.dateStr, dayStr:fmtDayStr(r.dateStr),
      crop:r.crop, cropId:r.crop?.id, evIdx:r.evIdx
    })),
    ...schedules.filter(s=>{
      const d=new Date(s.date); d.setHours(0,0,0,0);
      return Math.round((d-today0s)/86400000)>=-1;
    }).map(s=>{
      const d=new Date(s.date); d.setHours(0,0,0,0);
      const cr=crops.find(c=>c.id===s.cropId);
      const db=CDB[cr?.type]||{};
      const lbl=cr?(db.e||"🌱")+" "+(db.n||cr.type)+(cr.variety?"("+cr.variety+")":""):"";
      return {
        key:"s"+s.id, isCustom:true, isCropEvent:false,
        sortD:d, urgent:Math.round((d-today0s)/86400000)<=1,
        icon:"📌", label:lbl, msg:s.memo,
        dateStr:s.date, dayStr:fmtDayStr(s.date), schedId:s.id
      };
    })
  ].sort((a,b)=>a.sortD-b.sortD);
  const shownItems = reminderMode==="auto" ? autoItems
    : reminderMode==="custom" ? customItems
    : [...autoItems,...customItems].sort((a,b)=>a.sortD-b.sortD);

  return (
    <div style={{padding:"10px 12px 16px"}}>

      {/* 初回ガイド: 圃場or品目が未登録のとき */}
      {!dbLoad && (fields.length===0 || crops.length===0) && (
        <div style={{background:"linear-gradient(135deg,#2d6a3f,#419857)",borderRadius:14,padding:"16px 16px",color:"#fff",marginBottom:12}}>
          <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:"1rem",fontWeight:700,marginBottom:4}}>🌱 サクメモへようこそ</div>
          <div style={{fontSize:".76rem",opacity:.92,marginBottom:12,lineHeight:1.5}}>次の3ステップで記録を始められます。</div>
          {[
            {n:1,t:"圃場を登録",d:"畑や区画の場所を登録します",done:fields.length>0,act:()=>setScr&&setScr("fields")},
            {n:2,t:"育てる品目を登録",d:"栽培する野菜・果物を追加します",done:crops.length>0,act:()=>setScr&&setScr("fields")},
            {n:3,t:"作業を記録",d:"播種・定植・収穫などを記録します",done:logs.length>0,act:()=>onNew&&onNew()},
          ].map(s=>(
            <div key={s.n} onClick={s.act} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",marginBottom:7,borderRadius:10,background:s.done?"rgba(255,255,255,.15)":"rgba(255,255,255,.95)",cursor:"pointer"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:s.done?"#fff":"#2d6a3f",color:s.done?"#2d6a3f":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:".82rem",flexShrink:0}}>{s.done?"✓":s.n}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:".82rem",fontWeight:700,color:s.done?"#fff":"#2d6a3f"}}>{s.t}</div>
                <div style={{fontSize:".68rem",color:s.done?"rgba(255,255,255,.8)":"#7a6f5d"}}>{s.d}</div>
              </div>
              {!s.done&&<span style={{color:"#2d6a3f",fontSize:"1rem"}}>›</span>}
            </div>
          ))}
        </div>
      )}


                  {/* 次の作業予定 */}
      <div style={{...S.card,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".88rem",color:"#5c3d1e"}}>📅 次の作業予定</div>
          <button onClick={()=>setMSched({date:todayStr(),title:"",cropId:"",id:null})}
            style={{...S.btn,...S.btnSm,background:G,color:"#fff",fontSize:".72rem"}}>＋ 予定追加</button>
        </div>
        {/* モード切替 */}
        <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e0d9ce",marginBottom:10}}>
          {[["both","すべて"],["auto","🤖 自動"],["custom","📌 カスタム"]].map(([v,l])=>(
            <button key={v} onClick={()=>setReminderMode(v)}
              style={{flex:1,padding:"5px 0",border:"none",background:reminderMode===v?G:"#fff",color:reminderMode===v?"#fff":"#888",fontWeight:reminderMode===v?700:400,fontSize:".7rem",cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
        {/* 統合リスト（日付順） */}
        {shownItems.length===0
          ? <div style={{color:"#aaa",fontSize:".78rem",textAlign:"center",padding:"8px 0"}}>予定はありません</div>
          : shownItems.map((item,i)=>(
            <div key={item.key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:6,borderRadius:8,
              background:item.urgent?"#fff3cd":"#f6f3ec",border:"1px solid "+(item.urgent?"#ffc107":"#e8e0d5")}}>
              <span style={{fontSize:"1.1rem",flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                {item.label&&<div style={{fontSize:".68rem",color:"#888",marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</div>}
                <div style={{fontSize:".8rem",fontWeight:700,color:"#1c1a14",lineHeight:1.3,wordBreak:"break-all"}}>
                  {/* msgの末尾にある「今日」「明日」「〇日後」「〇日前」を除去して作業名だけ表示 */}
                  {(item.msg||"").replace(/\s*(今日|明日|\d+日後|\d+日前)$/, "")}
                  {item.urgent&&<span style={{marginLeft:6,background:"#ffc107",color:"#856404",borderRadius:3,padding:"0 4px",fontSize:".62rem",fontWeight:700}}>要対応</span>}
                </div>
                <div style={{fontSize:".68rem",color:item.urgent?"#856404":"#888",marginTop:1}}>
                  {item.dateStr}　{item.dayStr}
                </div>
              </div>
              <button onClick={()=>{
                if(!window.confirm("この予定を完了済みにして非表示にしますか？")) return;
                if(item.isCropEvent&&item.cropId){
                  // 最新のcropを取得（古い参照でなく）
                  const latestCrop=crops.find(cr=>cr.id===item.cropId);
                  if(!latestCrop){showToast("品目が見つかりません");return;}
                  const newEvs=(latestCrop.customEvents||[]).map((ev,ei)=>ei===item.evIdx?{...ev,done:true}:ev);
                  const updated={...latestCrop,customEvents:newEvs};
                  setCrops(crops.map(cr=>cr.id===item.cropId?updated:cr),updated,fields);
                } else if(item.schedId){
                  deleteSchedule(item.schedId);
                } else if(!item.isCustom && item.key){
                  // 自動リマインダーを非表示
                  dismissAutoItem(item.key);
                } else {
                  showToast("自動リマインダーは品目設定から変更できます");
                }
              }} style={{...S.btn,...S.btnSm,background:"#e8f5e9",border:"1px solid #81c784",color:"#388e3c",fontSize:".75rem",flexShrink:0,padding:"4px 8px"}} title="完了・非表示">✓</button>
            </div>
          ))
        }
      </div>
      {/* カスタム予定モーダル */}
      {mSched&&<ModalWithSave open={!!mSched} title={mSched.id?"予定を編集":"予定を追加"} onSave={saveSchedule} onClose={()=>setMSched(null)}>
        <FG label="タイトル *"><Inp value={mSched.title} onChange={v=>setMSched({...mSched,title:v})} placeholder="例：追肥・収穫など"/></FG>
        <FG label="予定日"><Inp type="date" value={mSched.date} onChange={v=>setMSched({...mSched,date:v})}/></FG>
        <FG label="品目（任意）"><Sel value={mSched.cropId||""} onChange={v=>setMSched({...mSched,cropId:v})}
          options={makeCropOptions(crops.filter(c=>!c.ended),"品目なし")}/>
        </FG>
      </ModalWithSave>}
      {/* みんなのサクメモ */}
      <a href="/community.html" style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#2d6a3f,#419857)",borderRadius:14,padding:"13px 16px",marginBottom:9,textDecoration:"none"}}>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:".9rem",fontFamily:"'Shippori Mincho B1',serif"}}>🌾 みんなのサクメモ</div>
          <div style={{color:"rgba(255,255,255,.8)",fontSize:".74rem",marginTop:3}}>公開中の農場記録を見る</div>
        </div>
        <span style={{color:"#fff",fontSize:"1.3rem"}}>›</span>
      </a>
    </div>
  );
}

// FIELDS
function FieldsScreen({ fields, setFields, setFieldsR, crops, setCrops, setCropsR, costs, setCosts, logs, setLogs, setLogsR, plots, setPlots, setPlotsR, showToast, editCrop, uid }) {
  const [mField, setMField] = useState(null);
  const [mCrop,  setMCrop]  = useState(null);
  // みんなのサクメモ：公開設定・閲覧数
  const [pubCropId, setPubCropId] = useState(null);
  const [pubStats,  setPubStats]  = useState(null);
  const reloadPubStats = () => { loadPublicStats(uid, crops.map(c=>c.id)).then(setPubStats).catch(()=>{}); };
  useEffect(()=>{ if(uid) reloadPubStats(); },[uid, crops.length]);
  const pubCrop = pubCropId ? crops.find(c=>c.id===pubCropId) : null;
  const pubBtn = (c) => {
    const n = pubStats?.crops?.[c.id]?.total||0;
    return c.isPublic
      ? <button style={{...S.btn,...S.btnSm,background:"#f0f9f0",color:G,border:"1px solid #6ee7b7"}} onClick={()=>setPubCropId(c.id)} title="公開設定・閲覧数">🌐 公開中 👁{n}</button>
      : <button style={{...S.btn,...S.btnSm,background:"#fff",color:"#888",border:"1px solid "+BD}} onClick={()=>setPubCropId(c.id)} title="みんなのサクメモに公開">🔒 公開設定</button>;
  };

  // 外部から品目編集を開く
  useEffect(()=>{
    if(!editCrop) return;
    const i = crops.indexOf(editCrop);
    if(i>=0) {
      // 既存費用から seedCost を取得して表示
      const existingSeed = costs.find(co=>co.cropId===editCrop.id&&co.cat==="seed");
      setMCrop({...editCrop, _idx:i,
        seedCost: editCrop.seedCost||existingSeed?.amt||""
      });
    }
  },[editCrop]);
  const eF={ id:uid0(),name:"",area:"",soil:"砂壌土",addr:"",memo:"" };
  const eC={ id:uid0(),fieldId:"",fieldIdx:0,type:"",variety:"",germRate:"",stocks:"",ridgeW:"",ridgeH:"",ridgeLen:"",rows:"",rowSpace:"",plantSpace:"",cultivationArea:"",sowDate:"",plantDate:"",memo:"",cultivationType:"nursery",growEnv:"field",seedCost:"",seedNote:"",customName:"",potSize:"",potVolume:"",potCount:"", agriMonthStart:"" };
  const saveField=()=>{
    if(!mField) return;
    const item={...mField,id:mField.id||uid0()};
    const n=mField._idx!==undefined?fields.map((x,i)=>i===mField._idx?item:x):[...fields,item];
    setFields(n,item);
    setMField(null);
    showToast("保存しました");
  };
  const saveCrop=()=>{
    if(!mCrop) return;
    const entry={...mCrop,id:mCrop.id||uid0(),fieldId:fields[mCrop.fieldIdx]?.id||mCrop.fieldId||""};
    const n=mCrop._idx!==undefined?crops.map((x,i)=>i===mCrop._idx?entry:x):[...crops,entry];
    setCrops(n,entry,fields);
    // 費用ページの既存種苗代を紐付け（選択された場合は品目を割当し、自動追加はスキップ）
    if(mCrop._linkSeedCostId){
      const linkCost=costs.find(co=>co.id===mCrop._linkSeedCostId);
      if(linkCost){
        const updated={...linkCost,cropId:entry.id};
        setCosts(costs.map(co=>co.id===linkCost.id?updated:co),updated);
        showToast("種・苗代を紐付けました");
        setMCrop(null);
        return;
      }
    }
    // 品目編集時: 費用を完全同期（名前・日付・金額）
    if(mCrop._idx!==undefined && mCrop.id){
      const db2=CDB[entry.type]||{};
      const newName=(db2.n||entry.customName||entry.type)+(entry.variety?" "+entry.variety:"")+" 種・苗代";
      const newDate=entry.plantDate||entry.sowDate||todayStr();
      const newAmt=String(parseFloat(String(entry.seedCost||"0").replace(/,/g,""))||0);
      const newSeedAmt=parseFloat(newAmt)||0;

      const existingSeedCost=costs.find(co=>co.cropId===mCrop.id&&co.cat==="seed");

      if(existingSeedCost){
        if(newSeedAmt>0){
          // 既存費用を更新
          const updated={...existingSeedCost, name:newName, date:newDate, amt:newAmt};
          const newCosts=costs.map(co=>co.id===existingSeedCost.id?updated:co);
          setCosts(newCosts, updated);
        } else {
          // 金額が0になったら費用を削除
          dbDelete("costs",existingSeedCost.id);
          setCosts(costs.filter(co=>co.id!==existingSeedCost.id));
        }
      } else if(newSeedAmt>0){
        // 費用がなかった場合は新規追加
        const newEntry={
          id:uid0(), cat:"seed", name:newName, amt:newAmt,
          date:newDate, qty:"1", qunit:"式",
          fieldIdx:entry.fieldIdx!==undefined?entry.fieldIdx:0,
          fieldId:fields[entry.fieldIdx]?.id||"",
          cropId:entry.id, note:entry.seedNote||""
        };
        setCosts([...costs,newEntry],newEntry);
      }
    }
    // 種・苗代を費用に自動追加（新規登録時のみ）
    const seedAmt = parseFloat(String(mCrop.seedCost).replace(/,/g,''))||0;
    if(mCrop._idx===undefined && seedAmt>0){
      const db=CDB[mCrop.type]||{};
      const seedEntry={
        id:uid0(),
        cat:"seed",
        name:(db.n||mCrop.customName||mCrop.type)+(mCrop.variety?" "+mCrop.variety:"")+" 種・苗代",
        amt:String(seedAmt),
        date:mCrop.plantDate||mCrop.sowDate||todayStr(),
        qty:"1", qunit:"式",
        fieldIdx:mCrop.fieldIdx!==undefined?mCrop.fieldIdx:0,
        fieldId:fields[mCrop.fieldIdx]?.id||"",
        cropId:entry.id,
        note:mCrop.seedNote||""
      };
        setCosts([...costs,seedEntry],seedEntry);
      showToast("保存しました（種・苗代を費用に追加）");
    } else {
      showToast("保存しました");
    }
    setMCrop(null);
  };
  return (
    <div style={S.scr} className="scr-inner">
      <div style={S.sec}><span>🌾 圃場一覧（{fields.length}件）</span><button style={S.secBtn} onClick={()=>setMField({...eF})}>＋ 圃場追加</button></div>
      {!fields.length&&<div style={{color:TX3,fontSize:".82rem",padding:8,textAlign:"center"}}>圃場がまだ登録されていません</div>}
      {fields.map((f,i)=>(
        <div key={f.id} style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><b style={{fontSize:".95rem"}}>{f.name}</b><div style={{fontSize:".7rem",color:TX3,marginTop:1}}>{f.addr||""} / {f.area||"?"}a / {f.soil||""}</div></div>
            <div style={{display:"flex",gap:4}}><button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>setMField({...f,_idx:i})}>編集</button><button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{
                const relCrops=crops.filter(c=>c.fieldId===f.id||c.fieldIdx===i);
                const relLogs=logs.filter(l=>l.fieldId===f.id||l.fieldIdx===i);
                const relCosts=costs.filter(c=>c.fieldId===f.id);
                const relPlots=(plots||[]).filter(p=>p.fieldId===f.id);
                const total=relCrops.length+relLogs.length+relCosts.length+relPlots.length;
                const msg=total>0?`「${f.name}」を削除すると、関連する品目${relCrops.length}件・作業記録${relLogs.length}件・費用${relCosts.length}件・栽培計画${relPlots.length}件も削除されます。よろしいですか？`:`「${f.name}」を削除しますか？`;
                if(!window.confirm(msg))return;
                // カスケード削除
                relCrops.forEach(c=>dbDelete("crops",c.id));
                relLogs.forEach(l=>dbDelete("logs",l.id));
                relCosts.forEach(c=>dbDelete("costs",c.id));
                relPlots.forEach(p=>dbDelete("plots",p.id));
                dbDelete("fields",f.id);
                // ローカル状態更新（fieldIdxの再計算込み）
                const newFields=fields.filter((_,j)=>j!==i);
                const relCropIds=new Set(relCrops.map(c=>c.id));
                const relLogIds=new Set(relLogs.map(l=>l.id));
                const relCostIds=new Set(relCosts.map(c=>c.id));
                const relPlotIds=new Set(relPlots.map(p=>p.id));
                if(typeof setFieldsR==="function")setFieldsR(newFields);else setFields(newFields);
                const fixIdx=o=>{const fi=newFields.findIndex(nf=>nf.id===o.fieldId);return fi>=0?fi:0;};
                if(setCropsR)setCropsR(crops.filter(c=>!relCropIds.has(c.id)).map(c=>({...c,fieldIdx:fixIdx(c)})));
                if(setLogsR)setLogsR(logs.filter(l=>!relLogIds.has(l.id)).map(l=>({...l,fieldIdx:fixIdx(l)})));
                setCosts(costs.filter(c=>!relCostIds.has(c.id)));
                if(setPlotsR)setPlotsR((plots||[]).filter(p=>!relPlotIds.has(p.id)));
                showToast("圃場と関連データを削除しました");
              }}>削除</button></div>
          </div>
          {f.memo&&<div style={{fontSize:".76rem",color:"#5a5040",marginTop:5}}>{f.memo}</div>}
          <div style={{fontSize:".7rem",color:TX3,marginTop:5}}>品目:{crops.filter(c=>c.fieldIdx===i).length}品目 / 記録:{logs.filter(l=>l.fieldIdx===i).length}件</div>
        </div>
      ))}
      <div style={S.sec}><span>🌱 栽培中（{crops.filter(c=>!c.ended).length}件）</span><button style={S.secBtn} onClick={()=>setMCrop({...eC,fieldIdx:0})}>＋ 品目追加</button></div>
      {crops.some(c=>c.isPublic)&&pubStats&&<div style={{display:"flex",alignItems:"center",gap:8,background:"#f0f9f0",border:"1px solid #b7e4c7",borderRadius:10,padding:"8px 12px",marginBottom:8,fontSize:".74rem",color:"#2d6a3f"}}>
        <span style={{fontSize:"1rem"}}>🌾</span>
        <span style={{flex:1}}>みんなのサクメモ　農場ページ 👁 累計<b>{pubStats.farmTotal||0}</b>回{pubStats.hasDaily?<>・今日<b>{sumDaily(pubStats.daily?.farm,1)}</b>・7日間<b>{sumDaily(pubStats.daily?.farm,7)}</b></>:null}</span>
        <button onClick={reloadPubStats} style={{background:"none",border:"none",color:"#2d6a3f",cursor:"pointer",fontSize:".9rem",padding:2}} title="更新">↻</button>
      </div>}
      {!crops.filter(c=>!c.ended).length&&<div style={{color:TX3,fontSize:".82rem",padding:8,textAlign:"center"}}>栽培中の品目はありません</div>}
      {crops.filter(c=>!c.ended).map((c)=>{ const i=crops.indexOf(c);
        const db=CDB[c.type]||{}; const f=fields[c.fieldIdx]||{};
        const isFruit=db.fruit||false;
        const days=daysSince(c.plantDate);
        const plantYear=c.plantDate?new Date(c.plantDate).getFullYear():null;
        const yearsSincePlant=plantYear?new Date().getFullYear()-plantYear+1:null;
        const harvestD=c.type==="custom"?(parseInt(c.customDays)||90):(db?.maturity?.[c.maturity||"mid"]||db?.d||90);
        const pct=Math.min(100,Math.round(days/harvestD*100));
        const cl=logs.filter(l=>l.cropId===c.id);
        const sowLog=cl.find(l=>l.sowQty);
        const germLog=cl.find(l=>l.germinationCnt);
        const germRate=sowLog&&germLog?Math.round((parseInt(germLog.germinationCnt)/parseInt(sowLog.sowQty))*100):null;
        return (
          <div key={c.id} style={S.card}>
            {/* ─── 上段: 絵文字 + 品目名 + 編集ボタン ─── */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:"1.8rem",lineHeight:1,flexShrink:0}}>{db.e||"🌱"}</span>
              <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                <div style={{fontWeight:700,fontSize:".92rem",lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {getCropName(c)}
                </div>
                {c.variety&&<div style={{fontSize:".73rem",color:TX3,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.variety}</div>}
              </div>

            </div>
            {/* ─── 中段: 圃場・日数・株数 ─── */}
            <div style={{fontSize:".73rem",color:TX3,marginTop:7,lineHeight:1.6}}>
              <span>📍{f.name||"?"}</span>
              {c.plantDate&&<span style={{marginLeft:8}}>📅{isFruit?yearsSincePlant+"年目":(c.cultivationType==="direct"?"播種":"定植")+days+"日目"}</span>}
              {!c.plantDate&&<span style={{marginLeft:8,color:WARN}}>⚠️ 定植日未設定</span>}
              {c.stocks&&<span style={{marginLeft:8}}>👥{c.stocks}株</span>}
              {germRate!==null&&<span style={{marginLeft:8}}>🌱発芽率{germRate}%</span>}
            </div>
            {/* ─── 生育進捗バー ─── */}
            {(c.plantDate||c.sowDate)&&!isFruit&&<div style={{marginTop:8}}>
              <div style={{height:6,background:"#e8e0d5",borderRadius:999,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#2d6a3f,#52b788)",borderRadius:999,transition:"width .5s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:".68rem",color:TX3,marginTop:3}}>
                <span>生育進捗 {pct}%</span>
                <span>収穫まで約 {Math.max(0,harvestD-days)} 日</span>
              </div>
            </div>}
            {/* ─── 収穫累計 ─── */}
            {(()=>{
              const _hv=logs.filter(l=>l.cropId===c.id);
              const _kg=_hv.reduce((s,l)=>s+(parseFloat(l.hvKg)||0),0);
              const _cnt=_hv.reduce((s,l)=>s+(parseInt(l.hvCnt)||0),0);
              if(!_kg&&!_cnt) return null;
              return <div style={{marginTop:6,fontSize:".73rem",color:"#059669",fontWeight:600}}>
                🧺 収穫累計 {_kg>0?_kg.toFixed(1)+"kg":""}{_cnt>0?" "+_cnt+"個":""}
              </div>;
            })()}
            {/* ─── 施肥ガイド（折りたたみ）─── */}
            {FERT_GUIDE[c.type]&&<details style={{marginTop:8,borderTop:"1px solid #e8e0d5",paddingTop:6}}>
              <summary style={{fontSize:".73rem",fontWeight:700,color:"#2d6a3f",cursor:"pointer",listStyle:"none",userSelect:"none"}}>
                📋 施肥ガイド ▾
              </summary>
              <div style={{marginTop:6,fontSize:".69rem",color:"#374151",lineHeight:1.7,background:"#f5fdf7",borderRadius:8,padding:"8px 10px"}}>
                <div style={{marginBottom:3,fontWeight:600}}>🌱 元肥</div>
                <div style={{marginBottom:6,color:"#555"}}>{FERT_GUIDE[c.type].base}</div>
                {FERT_GUIDE[c.type].chase.map((ch,ci)=>(
                  <div key={ci} style={{marginBottom:4}}>
                    <span style={{fontWeight:600}}>🌿 追肥{ci+1}</span> {ch.timing}<br/>
                    <span style={{paddingLeft:16,color:"#555"}}>→ {ch.amt}</span>
                  </div>
                ))}
                {FERT_GUIDE[c.type].tip&&<div style={{marginTop:4,color:"#888",borderTop:"1px solid #d1fae5",paddingTop:4}}>💡 {FERT_GUIDE[c.type].tip}</div>}
              </div>
            </details>}
            {/* ─── 操作ボタン（右寄せ・統一スタイル）─── */}
            <div style={{display:"flex",gap:5,marginTop:7,paddingTop:7,borderTop:"1px solid #e8e0d5",justifyContent:"flex-end",flexWrap:"wrap"}}>
              {pubBtn(c)}
              <button style={{...S.btn,...S.btnS,...S.btnSm}}
                onClick={()=>{const existingSeed=costs.find(co=>co.cropId===c.id&&co.cat==="seed");setMCrop({...c,_idx:i,seedCost:c.seedCost||existingSeed?.amt||""});}}>編集</button>
              <button style={{...S.btn,...S.btnSm,background:"#f59e0b",color:"#fff"}}
                onClick={()=>{const copy={...c,id:uid0(),_idx:undefined,isPublic:false};setMCrop(copy);showToast("複製します。内容を確認して保存してください");}}>コピー</button>
              <button style={{...S.btn,...S.btnSm,background:"#fff",color:"#c2410c",border:"1px solid #f0b896"}}
                onClick={()=>{const ed=window.prompt("栽培終了日を入力してください",todayStr());if(ed===null)return;const u={...c,ended:true,endDate:ed||todayStr()};setCrops(crops.map((x,j)=>j===i?u:x),u);showToast("栽培を終了しました");}}>終了</button>
              <button style={{...S.btn,...S.btnR,...S.btnSm}}
                onClick={()=>{
                  const relLogs=logs.filter(l=>l.cropId===c.id);
                  const relCosts=costs.filter(co=>co.cropId===c.id);
                  const total=relLogs.length+relCosts.length;
                  const msg=total>0?`この品目を削除すると、作業記録${relLogs.length}件・費用${relCosts.length}件も削除されます。よろしいですか？`:"削除しますか?";
                  if(!window.confirm(msg))return;
                  dbDelete("crops",c.id);
                  relLogs.forEach(l=>dbDelete("logs",l.id));
                  relCosts.forEach(co=>dbDelete("costs",co.id));
                  const relLogIds=new Set(relLogs.map(l=>l.id));
                  const relCostIds=new Set(relCosts.map(co=>co.id));
                  const filtered=crops.filter((_,j)=>j!==i);
                  if(typeof setCropsR==="function")setCropsR(filtered);else setCrops(filtered);
                  if(setLogsR)setLogsR(logs.filter(l=>!relLogIds.has(l.id)));
                  setCosts(costs.filter(co=>!relCostIds.has(co.id)));
                  showToast("品目と関連データを削除しました");
                }}>削除</button>
            </div>
          </div>
        );
      })}
      {crops.filter(c=>c.ended).length>0&&<>
        <div style={S.sec}><span>📦 栽培終了（{crops.filter(c=>c.ended).length}件）</span></div>
        {crops.filter(c=>c.ended).map((c)=>{ const i=crops.indexOf(c);
          const db=CDB[c.type]||{}; const f=fields[c.fieldIdx]||{};
          return (
            <div key={c.id} style={{...S.card,opacity:.7,borderLeft:"4px solid #e67e22"}}>
              <div style={{display:"flex",gap:9,alignItems:"center"}}>
                <span style={{fontSize:"1.6rem"}}>{db.e||"🌱"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:".88rem"}}>{getCropName(c)}{c.variety?" ("+c.variety+")":""}</div>
                  <div style={{fontSize:".7rem",color:TX3}}>{f.name||"?"} · 終了:{c.endDate?fmtYMD(c.endDate):"—"}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                  <button style={{...S.btn,background:"#e0d9ce",color:"#5a5040",padding:"4px 10px",fontSize:".7rem",borderRadius:8,width:"auto"}}
                    onClick={()=>{
                      const d=window.prompt("終了日を変更してください",c.endDate||todayStr());
                      if(d===null)return;
                      const u={...c,endDate:d};
                      setCrops(crops.map((x,j)=>j===i?u:x),u);
                      showToast("終了日を更新しました");
                    }}>📅 {c.endDate||"日付未設定"}</button>
                  {pubBtn(c)}
                  <button style={{...S.btn,background:"#aaa",color:"#fff",padding:"4px 10px",fontSize:".7rem",borderRadius:8,width:"auto"}}
                    onClick={()=>{if(!window.confirm("栽培中に戻しますか？"))return;const u={...c,ended:false,endDate:""};setCrops(crops.map((x,j)=>j===i?u:x),u);showToast("栽培中に戻しました");}}>再開</button>
                  <button style={{...S.btn,...S.btnR,...S.btnSm}}
                    onClick={()=>{if(!window.confirm("削除しますか?"))return;dbDelete("crops",c.id);const filtered=crops.filter((_,j)=>j!==i);if(typeof setCropsR==="function")setCropsR(filtered);else setCrops(filtered);showToast("削除しました");}}>削除</button>
                </div>
              </div>
            </div>
          );
        })}
      </>}
      <ModalWithSave open={!!mField} onClose={()=>setMField(null)} title={mField?._idx!==undefined?"圃場を編集":"圃場を登録"} onSave={saveField}>
        {mField&&<><FG label="圃場名"><Inp value={mField.name} onChange={v=>setMField({...mField,name:v})} placeholder="例：第1圃場"/></FG><R2><FG label="面積（a）"><Inp type="number" value={mField.area} onChange={v=>setMField({...mField,area:v})}/></FG><FG label="土壌"><Sel value={mField.soil} onChange={v=>setMField({...mField,soil:v})} options={["砂壌土","壌土","粘土質","黒ボク","その他"].map(v=>({value:v,label:v}))}/></FG></R2><FG label="住所（天気連動）"><Inp value={mField.addr} onChange={v=>setMField({...mField,addr:v})} placeholder="例：静岡県沼津市"/></FG><FG label="都道府県">
              <Sel value={mField.prefecture||""} onChange={v=>setMField({...mField,prefecture:v})}
                options={[{value:"",label:"（未選択）"},...["北海道","青森","岩手","宮城","秋田","山形","福島","茨城","栃木","群馬","埼玉","千葉","東京","神奈川","新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知","三重","滋賀","京都","大阪","兵庫","奈良","和歌山","鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知","福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"].map(p=>({value:p,label:p}))]}/>
            </FG>
            <FG label="メモ"><TA value={mField.memo} onChange={v=>setMField({...mField,memo:v})}/></FG></>}
      </ModalWithSave>
      {pubCrop&&<CropPublicModal crop={pubCrop} crops={crops} setCrops={setCrops} fields={fields} uid={uid} stats={pubStats}
        onClose={()=>setPubCropId(null)} onSaved={reloadPubStats} showToast={showToast}/>}
      <ModalWithSave open={!!mCrop} onSave={saveCrop} onClose={()=>{setMCrop(null);}} title={mCrop?._idx!==undefined?"品目を編集":"品目を登録"}>
        {mCrop&&<><FG label="圃場"><Sel value={mCrop.fieldIdx} onChange={v=>setMCrop({...mCrop,fieldIdx:parseInt(v)})} options={fields.map((f,i)=>({value:i,label:f.name}))}/></FG>
                <FG label="作物"><Sel value={mCrop.type} onChange={v=>setMCrop({...mCrop,type:v})} options={[{value:"",label:"選択してください"},...CROP_OPTIONS]} renderOption={o=>o.disabled?<option key={o.value} disabled style={{color:"#aaa",fontWeight:700}}>{o.label}</option>:<option key={o.value} value={o.value}>{o.label}</option>}/></FG>
                {mCrop.type==="custom" && (<>
                  <FG label="作物名"><Inp value={mCrop.customName||""} onChange={v=>setMCrop({...mCrop,customName:v})} placeholder="例：ハーブミックス、花卉など"/></FG>
                  <R2>
                    <FG label="収穫までの日数"><Inp type="number" value={mCrop.customDays||""} onChange={v=>setMCrop({...mCrop,customDays:v})} placeholder="例：90"/></FG>
                    <FG label="水やり頻度（日）"><Inp type="number" value={mCrop.customWater||""} onChange={v=>setMCrop({...mCrop,customWater:v})} placeholder="例：2"/></FG>
                  </R2>
                  <R2>
                    <FG label="生育適温 最低℃"><Inp type="number" value={mCrop.tempMin||""} onChange={v=>setMCrop({...mCrop,tempMin:v})} placeholder="例：18"/></FG>
                    <FG label="生育適温 最高℃"><Inp type="number" value={mCrop.tempMax||""} onChange={v=>setMCrop({...mCrop,tempMax:v})} placeholder="例：25"/></FG>
                  </R2>
                </>)}
                <FG label="品種名"><Inp value={mCrop.variety} onChange={v=>setMCrop({...mCrop,variety:v})} placeholder="例：桃太郎"/></FG>
                {CDB[mCrop.type]?.maturity&&<FG label="熟期">
                  <div style={{display:"flex",gap:7}}>
                    {[{v:"early",l:"早生"},{v:"mid",l:"中生"},{v:"late",l:"晩生"}].map(opt=>(
                      <button key={opt.v} type="button" onClick={()=>setMCrop({...mCrop,maturity:opt.v})}
                        style={{flex:1,padding:"8px 4px",border:"2px solid "+(mCrop.maturity===opt.v?"#419857":"#e0d9ce"),borderRadius:9,background:mCrop.maturity===opt.v?"#d4edda":"#fff",fontSize:".78rem",fontWeight:700,color:mCrop.maturity===opt.v?"#2d6a3f":"#5a5040",cursor:"pointer",textAlign:"center"}}>
                        {opt.l}
                        {CDB[mCrop.type]?.maturity&&<div style={{fontSize:".65rem",color:"#888",marginTop:2}}>{CDB[mCrop.type].maturity[opt.v]}日</div>}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:".72rem",color:TX3,marginTop:4}}>収穫予定日の計算に使います</div>
                </FG>}
                <FG label="栽培方法">
                  <div style={{display:"flex",gap:7}}>
                    {[{v:"direct",l:"🌱 直播"},{v:"nursery",l:"🪴 育苗後定植"},{v:"seedling",l:"🛒 苗を購入"},{v:"pot",l:"🪣 鉢植え"}].map(opt=>(
                      <button key={opt.v} type="button" onClick={()=>setMCrop({...mCrop,cultivationType:opt.v})}
                        style={{flex:1,padding:"8px 4px",border:"2px solid "+(mCrop.cultivationType===opt.v?"#419857":"#e0d9ce"),borderRadius:9,background:mCrop.cultivationType===opt.v?"#d4edda":"#fff",fontSize:".72rem",fontWeight:700,color:mCrop.cultivationType===opt.v?"#2d6a3f":"#5a5040",cursor:"pointer",textAlign:"center"}}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </FG>
                <R2>
                  {mCrop.cultivationType==="direct" && (
                    <FG label={<><TermTooltip>播種</TermTooltip>日 *</>}><Inp type="date" value={mCrop.plantDate} onChange={v=>setMCrop({...mCrop,plantDate:v})}/></FG>
                  )}
                  {mCrop.cultivationType==="nursery" && (<>
                    <FG label={<><TermTooltip>播種</TermTooltip>日</>}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <Inp type="date" value={mCrop.sowDate} onChange={v=>setMCrop({...mCrop,sowDate:v})}/>
                        {mCrop.sowDate&&<button type="button" onClick={()=>setMCrop({...mCrop,sowDate:""})} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:".8rem",flexShrink:0}}>✕</button>}
                      </div>
                    </FG>
                    <FG label={<><TermTooltip>定植</TermTooltip>日（後から作業記録で登録可）</>}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <Inp type="date" value={mCrop.plantDate} onChange={v=>setMCrop({...mCrop,plantDate:v})}/>
                        {mCrop.plantDate&&<button type="button" onClick={()=>setMCrop({...mCrop,plantDate:""})} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:".8rem",flexShrink:0}}>✕</button>}
                      </div>
                    </FG>
                  </>)}
                  {mCrop.cultivationType==="seedling" && (<>
                    <FG label={<>購入・<TermTooltip>定植</TermTooltip>日 *</>}><Inp type="date" value={mCrop.plantDate} onChange={v=>setMCrop({...mCrop,plantDate:v})}/></FG>
                  </>)}
                </R2>
                <R2><FG label="株数（本数）"><Inp type="number" value={mCrop.stocks} onChange={v=>setMCrop({...mCrop,stocks:v})} placeholder="120"/></FG><FG label=""><div/></FG></R2>
                <div style={{background:"#fffdf0",border:"1px solid #f9e4a0",borderRadius:10,padding:"10px 12px",marginBottom:9}}>
                  <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".82rem",color:"#5c3d1e",marginBottom:7}}>
                    🌱 種・苗の費用
                    {mCrop._idx!==undefined&&costs.find(co=>co.cropId===mCrop.id&&co.cat==="seed")&&
                      <span style={{fontSize:".7rem",color:"#2d6a3f",marginLeft:8}}>
                        （登録済: {costs.find(co=>co.cropId===mCrop.id&&co.cat==="seed")?.amt}円）
                      </span>
                    }
                  </div>
                  {/* 費用ページに先に登録した種・苗代から選んで紐付け */}
                  <FG label="費用ページの種・苗代から選択">
                    <Sel value={mCrop._linkSeedCostId||""} onChange={v=>{
                      const co=costs.find(x=>x.id===v);
                      setMCrop({...mCrop,_linkSeedCostId:v,seedCost:co?co.amt:"",seedNote:co?(co.note||co.name):""});
                    }} options={[{value:"",label:"（割り当てない）"},...costs.filter(co=>co.cat==="seed"&&(!co.cropId||co.cropId===mCrop.id)).map(co=>({value:co.id,label:co.name+" "+Math.round(co.amt||0).toLocaleString()+"円"+(co.date?" ("+fmtMD(co.date)+")":"")}))]}/>
                    <div style={{fontSize:".68rem",color:TX3,marginTop:3}}>費用ページで先に登録した種・苗代を選ぶと、この品目に割り当てます。{costs.filter(co=>co.cat==="seed"&&(!co.cropId||co.cropId===mCrop.id)).length===0?"（まだ種・苗代の費用がありません。費用ページで登録してください）":""}</div>
                  </FG>
                  <FG label="追肥リマインダーの間隔">
                    <Sel value={mCrop.fertInterval||""} onChange={v=>setMCrop({...mCrop,fertInterval:v})}
                      options={[{value:"",label:"標準（"+(FERT_INTERVAL[mCrop.type]>0?FERT_INTERVAL[mCrop.type]+"日ごと":"リマインダーなし")+"）"},{value:"0",label:"追肥リマインダーを出さない"},...[7,10,14,18,21,25,30,40].map(n=>({value:String(n),label:n+"日ごと"}))]}/>
                    <div style={{fontSize:".68rem",color:TX3,marginTop:3}}>ホーム画面の「次の作業予定」に表示する追肥の間隔。品目に合わせて調整できます</div>
                  </FG>

                </div>

                {/* リマインダーモード */}
                <div style={{background:"#f0f9f0",borderRadius:10,padding:"10px 12px",marginBottom:9}}>
                  <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".82rem",color:"#5c3d1e",marginBottom:8}}>📅 リマインダー設定</div>
                  <FG label="リマインダーの種類">
                    <div style={{display:"flex",gap:8}}>
                      {[{v:"auto",l:"🤖 自動（収穫・追肥を自動計算）"},{v:"custom",l:"📌 カスタム（自分で日程を設定）"}].map(opt=>(
                        <button key={opt.v} onClick={()=>setMCrop({...mCrop,reminderMode:opt.v,customEvents:opt.v==="custom"?(mCrop.customEvents||[]):mCrop.customEvents})}
                          style={{...S.btn,flex:1,padding:"7px 4px",fontSize:".7rem",fontWeight:(mCrop.reminderMode||"auto")===opt.v?700:400,
                            background:(mCrop.reminderMode||"auto")===opt.v?G:"#fff",
                            color:(mCrop.reminderMode||"auto")===opt.v?"#fff":"#555",
                            border:"1px solid "+((mCrop.reminderMode||"auto")===opt.v?G:"#e0d9ce")}}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </FG>
                  {/* カスタムイベント入力 */}
                  {(mCrop.reminderMode||"auto")==="custom"&&<>
                    <div style={{fontSize:".72rem",color:"#5a5040",marginBottom:6}}>予定を追加してください（収穫・追肥・作業など）</div>
                    <R2>
                      <FG label="熟期（定植〜収穫の日数）">
                        <Inp type="number" value={mCrop.harvestDays||""} onChange={v=>setMCrop({...mCrop,harvestDays:v})} placeholder={"例："+((CDB[mCrop.type]?.d)||90)}/>
                      </FG>
                      <FG label="追肥間隔（日）">
                        <Inp type="number" value={mCrop.fertInterval||""} onChange={v=>setMCrop({...mCrop,fertInterval:v})} placeholder={"例：21"}/>
                      </FG>
                    </R2>
                    {(mCrop.customEvents||[]).map((ev,ei)=>(
                      <div key={ei} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                        <Inp type="date" value={ev.date||""} onChange={v=>setMCrop({...mCrop,customEvents:(mCrop.customEvents||[]).map((e,i)=>i===ei?{...e,date:v}:e)})}
                          style={{flex:"0 0 120px"}}/>
                        <Inp value={ev.title||""} onChange={v=>setMCrop({...mCrop,customEvents:(mCrop.customEvents||[]).map((e,i)=>i===ei?{...e,title:v}:e)})}
                          placeholder="例：追肥、収穫、消毒..." style={{flex:1}}/>
                        <Sel value={ev.type||"work"} onChange={v=>setMCrop({...mCrop,customEvents:(mCrop.customEvents||[]).map((e,i)=>i===ei?{...e,type:v}:e)})}
                          options={[{value:"harvest",label:"🧺収穫"},{value:"fert",label:"🌿追肥"},{value:"pest",label:"🐛防除"},{value:"work",label:"🔧作業"}]}
                          style={{width:80,flex:"none"}}/>
                        <button onClick={()=>setMCrop({...mCrop,customEvents:(mCrop.customEvents||[]).filter((_,i)=>i!==ei)})}
                          style={{...S.btn,...S.btnR,...S.btnSm,flexShrink:0}}>✕</button>
                      </div>
                    ))}
                    <button onClick={()=>setMCrop({...mCrop,customEvents:[...(mCrop.customEvents||[]),{date:todayStr(),title:"",type:"work",done:false}]})}
                      style={{...S.btn,...S.btnSm,background:G,color:"#fff",fontSize:".72rem",marginTop:4}}>＋ 予定を追加</button>
                  </>}
                </div>

                {/* 栽培環境の選択 */}
                <FG label="栽培環境">
                  <div style={{display:"flex",gap:8}}>
                    {[{v:"field",l:"🌾 畑・地植え"},{v:"pot",l:"🪴 鉢・プランター"}].map(opt=>(
                      <button key={opt.v} type="button" onClick={()=>setMCrop({...mCrop,growEnv:opt.v})}
                        style={{flex:1,padding:"10px 6px",border:"2px solid "+(mCrop.growEnv===opt.v?"#419857":"#e0d9ce"),borderRadius:9,background:mCrop.growEnv===opt.v?"#d4edda":"#fff",fontSize:".8rem",fontWeight:700,color:mCrop.growEnv===opt.v?"#2d6a3f":"#5a5040",cursor:"pointer",textAlign:"center"}}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </FG>

                {/* 畑の詳細 */}
                {(mCrop.growEnv==="field"||!mCrop.growEnv)&&<>
                  <R2><FG label="畝幅（cm）"><Inp type="number" value={mCrop.ridgeW} onChange={v=>setMCrop({...mCrop,ridgeW:v})}/></FG><FG label="畝高（cm）"><Inp type="number" value={mCrop.ridgeH} onChange={v=>setMCrop({...mCrop,ridgeH:v})}/></FG><FG label="畝長（m）"><Inp type="number" value={mCrop.ridgeLen||""} onChange={v=>setMCrop({...mCrop,ridgeLen:v})}/></FG><FG label="作付け面積（㎡）"><Inp type="number" value={mCrop.cultivationArea||""} onChange={v=>setMCrop({...mCrop,cultivationArea:v})}/></FG></R2>
                  <R3><FG label="条数"><Inp type="number" value={mCrop.rows} onChange={v=>setMCrop({...mCrop,rows:v})}/></FG><FG label="条間（cm）"><Inp type="number" value={mCrop.rowSpace} onChange={v=>setMCrop({...mCrop,rowSpace:v})}/></FG><FG label="株間（cm）"><Inp type="number" value={mCrop.plantSpace} onChange={v=>setMCrop({...mCrop,plantSpace:v})}/></FG></R3>
                </>}

                {/* 鉢植えの詳細 */}
                {mCrop.growEnv==="pot"&&<>
                  <div style={{background:"#f0f4ff",borderRadius:10,padding:"10px 12px",marginBottom:9}}>
                    <R2>
                      <FG label="鉢サイズ"><Sel value={mCrop.potSize||""} onChange={v=>setMCrop({...mCrop,potSize:v})}
                        options={[{value:"",label:"選択してください"},...["3号(9cm)","4号(12cm)","5号(15cm)","6号(18cm)","7号(21cm)","8号(24cm)","10号(30cm)","12号(36cm)","プランター小(15L程度)","プランター中(25L程度)","プランター大(40L程度)","その他"].map(v=>({value:v,label:v}))]}/></FG>
                      <FG label="容量（L）"><Inp type="number" value={mCrop.potVolume||""} onChange={v=>setMCrop({...mCrop,potVolume:v})} placeholder="例：10"/></FG>
                    </R2>
                    <FG label="鉢数"><Inp type="number" value={mCrop.potCount||""} onChange={v=>setMCrop({...mCrop,potCount:v})} placeholder="例：3"/></FG>
                  </div>
                </>}
              {(CDB[mCrop.type]?.fruit)&&<FG label="農業年度の開始月">
                <Sel value={mCrop.agriMonthStart||""} onChange={v=>setMCrop({...mCrop,agriMonthStart:v})}
                  options={[{value:"",label:"設定しない（暦年）"},...[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>({value:String(m),label:m+"月始まり"}))]}/>
                <div style={{fontSize:".7rem",color:"#888",marginTop:3}}>年またぎミカンなど必要な場合のみ設定</div>
              </FG>}
          <FG label="メモ"><TA value={mCrop.memo} onChange={v=>setMCrop({...mCrop,memo:v})}/></FG></>}
      </ModalWithSave>
    </div>
  );
}

// LOG
function LogScreen({ fields, crops, setCrops, fertMs, setFertMs, pestMs, setPestMs, equips, costs, setCosts, logs, setLogs, dbSaveLog, setLogsR, showToast, initialWork, editLog, editLogs=[], uid, saveRef, onDone }) {
  const [fieldIdx, setFieldIdx] = useState(0);
  const [cropId,   setCropId]   = useState("");
  const [works,    setWorks]    = useState(initialWork?new Set([initialWork]):new Set()); // 複数作業
  const work = works.size===1?[...works][0]:""; // 後方互換
  const setWork = v => setWorks(new Set([v]));   // 後方互換
  const toggleWork = v => setWorks(prev=>{
    const next=new Set(prev);
    if(next.has(v)) next.delete(v); else next.add(v);
    return next;
  });
  const [memo,     setMemo]     = useState("");
  const [date,     setDate]     = useState(todayStr());

  const [time,     setTime]     = useState(nowTime());
  const [dur,      setDur]      = useState("");
  const [logImg,   setLogImg]   = useState(null);
  const [logImg2,  setLogImg2]  = useState(null);
  const [logImg3,  setLogImg3]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [keepDate, setKeepDate] = useState("");   // 連続追加時に日付を保持
  const [keepCrop, setKeepCrop] = useState("");   // 連続追加時に品目を保持
  const [keepField,setKeepField]= useState(null); // 連続追加時に圃場を保持
  const [sowQty,   setSowQty]   = useState("");
  const [germCnt,  setGermCnt]  = useState("");
  const [germDate, setGermDate] = useState(todayStr());
  const [transpQty,setTranspQty]= useState("");
  const [fertIdx,  setFertIdx]  = useState("");
  const [fertName, setFertName] = useState("");
  const [fertDil,  setFertDil]  = useState("");
  const [fertSprayAmt, setFertSprayAmt] = useState("");
  const [fertSprayUnit,setFertSprayUnit]= useState("L");
  const [fertAmt,  setFertAmt]  = useState("");
  const [fertUnit, setFertUnit] = useState("kg");
  const [fertMeth, setFertMeth] = useState("追肥");
  const [fertCost, setFertCost] = useState("");
  // 施肥複数登録用
  const emptyFert = () => ({name:"",dil:"",sprayAmt:"",sprayUnit:"L",amt:"",unit:"kg",meth:"追肥",cost:""});
  const emptyPest = () => ({name:"",dil:"",sprayAmt:"",sprayUnit:"L",tgt:"",cost:""});
  const emptyEquip = () => ({_id:null,idx:"",act:"設置",useAmt:"",useUnit:"L"});
  const [fertEntries, setFertEntries] = useState([]);
  const [pestIdx,  setPestIdx]  = useState("");
  const [pestEntries, setPestEntries] = useState([]); // 農薬複数登録
  const [pestSprayAmt, setPestSprayAmt] = useState(""); // 散布量
  const [pestName, setPestName] = useState("");
  const [pestDil,  setPestDil]  = useState("");
  const [pestAmt,  setPestAmt]  = useState("");
  const [pestUnit, setPestUnit] = useState("L");
  const [pestTgt,  setPestTgt]  = useState("");
  const [pestCost, setPestCost] = useState("");
  // ホルモン処理（トマトトーン等）：保存先は防除と同じ列（農薬名・希釈倍数・使用量…）、作業の種類だけ "hormone"
  const emptyHorm = () => ({name:"",dil:"",sprayAmt:"",sprayUnit:"L",tgt:""});
  const [hormEntries, setHormEntries] = useState([]);
  const [hormName, setHormName] = useState("");
  const [hormDil,  setHormDil]  = useState("");
  const [hormAmt,  setHormAmt]  = useState("");
  const [hormUnit, setHormUnit] = useState("L");
  const [hormTgt,  setHormTgt]  = useState("");
  // 土壌改良（堆肥・石灰など）：保存先は施肥と同じ列（資材名・使用量・単位）、作業の種類だけ "amend"。在庫は肥料マスターから引く
  const emptyAmend = () => ({name:"",amt:"",unit:"kg"});
  const [amendEntries, setAmendEntries] = useState([]);
  const [amendName, setAmendName] = useState("");
  const [amendAmt,  setAmendAmt]  = useState("");
  const [amendUnit, setAmendUnit] = useState("kg");
  const amendOptions = [{value:"",label:"（選択）"},...fertMs.map((f,i)=>({value:i,label:f.name})).filter((_,i)=>fertMs[i]?.status!=="使い切り（非表示）")];
  // ─── 原液量の自動計算：資材の内容量の単位（在庫の単位）にそろえる。Lなら小数も使ってLで表示 ───
  const masterUnitByName = (list, name) => { const m=list.find(x=>x.name===name); return m?masterUnitOf(m):""; };
  const fertAutoOf = (meth,dil,spray,su,name) => isDilMeth(meth) ? calcConcentrate(spray,dil,su||"L",masterUnitByName(fertMs,name)) : null;
  const pestConcOf = (name,dil,amt,unit) => parseFloat(dil)>0 ? calcConcentrate(amt,dil,unit||"L",masterUnitByName(pestMs,name)) : null;
  // ホルモン処理で選べる資材（農薬マスターのうち種類がホルモン剤・生育調整剤のもの）
  const hormOptions = [{value:"",label:"（選択）"},...pestMs.map((p,i)=>({value:i,label:p.name})).filter((_,i)=>isHormoneMaster(pestMs[i]) && pestMs[i]?.status!=="使い切り（非表示）")];
  useEffect(()=>{
    const c=fertAutoOf(fertMeth,fertDil,fertSprayAmt,fertSprayUnit,fertName);
    if(!c) return;
    if(String(c.amt)!==String(fertAmt)) setFertAmt(String(c.amt));
    if(c.unit!==fertUnit) setFertUnit(c.unit);
  },[fertMeth,fertDil,fertSprayAmt,fertSprayUnit,fertName,fertMs]);
  useEffect(()=>{
    setFertEntries(prev=>{
      let changed=false;
      const next=prev.map(fe=>{
        const c=fertAutoOf(fe.meth,fe.dil,fe.sprayAmt,fe.sprayUnit,fe.name);
        if(!c || (String(c.amt)===String(fe.amt) && c.unit===fe.unit)) return fe;
        changed=true; return {...fe, amt:String(c.amt), unit:c.unit};
      });
      return changed?next:prev;
    });
  },[fertEntries,fertMs]);
  const [eventType,setEventType]= useState("");
  const [eventNote,setEventNote]= useState("");
  const [otherNote,setOtherNote]= useState("");
  const [hvKg,     setHvKg]     = useState("");
  const [hvCnt,    setHvCnt]    = useState("");
  const [hvQ,      setHvQ]      = useState("秀品");
  const [hvPrice,  setHvPrice]  = useState("");
  // 品質別収穫
  const [hvGrades, setHvGrades] = useState({
    秀品:{kg:"",cnt:"",price:""},
    優品:{kg:"",cnt:"",price:""},
    良品:{kg:"",cnt:"",price:""},
    規格外:{kg:"",cnt:"",price:""},
  });
  const [discardCnt,setDiscardCnt]=useState("");
  const [addCnt,   setAddCnt]   = useState("");
  const [equipSel, setEquipSel] = useState([]);
  const [equipEntries, setEquipEntries] = useState([]); // 資材複数登録
  const [equipAct, setEquipAct] = useState("設置");
  const [equipUseAmt,setEquipUseAmt]= useState("");
  const [equipUseUnit,setEquipUseUnit]=useState("L");
  const [repotSize, setRepotSize] = useState("");
  const [repotVol,  setRepotVol]  = useState("");
  const [editId,   setEditId]   = useState(null);
  const recogRef = useRef(null);

  // 編集モード: editLog が渡されたら各フィールドを初期化
  // editLogがnullのとき（新規作成）は全フィールドをリセット
useEffect(()=>{
    if(!editLog) {
      setEditId(null);setWorks(new Set());setMemo("");setLogImg(null);setLogImg2(null);setLogImg3(null);
      setHvGrades({秀品:{kg:"",cnt:"",price:""},優品:{kg:"",cnt:"",price:""},良品:{kg:"",cnt:"",price:""},規格外:{kg:"",cnt:"",price:""}});
      setFieldIdx(0);setCropId("");setDate(todayStr());setTime(nowTime());setDur("");
      setSowQty("");setGermCnt("");setGermDate(todayStr());setTranspQty("");
      setFertIdx("");setFertName("");setFertAmt("");setFertUnit("kg");setFertMeth("追肥");setFertCost("");setFertEntries([]);
      setPestIdx("");setPestName("");setPestDil("");setPestAmt("");setPestUnit("L");setPestTgt("");setPestCost("");setPestEntries([]);setPestSprayAmt("");
      setHormName("");setHormDil("");setHormAmt("");setHormUnit("L");setHormTgt("");setHormEntries([]);
      setAmendName("");setAmendAmt("");setAmendUnit("kg");setAmendEntries([]);
      setEventType("");setEventNote("");setOtherNote("");
      setHvKg("");setHvCnt("");setHvQ("秀品");setHvPrice("");
      setDiscardCnt("");setAddCnt("");setEquipSel([]);setEquipAct("設置");setEquipUseAmt("");setEquipUseUnit("L");setEquipEntries([]);setRepotSize("");setRepotVol("");  return;
    }
    setEditId(editLog._isCopy ? null : editLog.id);
    setFieldIdx(editLog.fieldIdx||0);
    setCropId(editLog.cropId||"");
    // 複数作業を復元
    const _validWorks = new Set(WORK_TYPES.map(w=>w.value));
    const _allWorks = (editLogs&&editLogs.length>1)
      ? new Set(editLogs.map(l=>l.work).filter(w=>w&&_validWorks.has(w)))
      : new Set(editLog.work&&_validWorks.has(editLog.work)?[editLog.work]:[]);
    setWorks(_allWorks);
    // memoはグループ内のどのlogにあっても復元する
    const _memoLog = (editLogs&&editLogs.length>0?editLogs:[editLog]).find(l=>l.memo);
    setMemo(_memoLog?.memo||"");
    setDate(editLog.date||todayStr());
    setTime(editLog.time||nowTime());
    setDur(editLog.duration||"");

    // editLogsから各作業タイプのlogを取得
    const allL    = editLogs&&editLogs.length>0 ? editLogs : [editLog];
    const hvLog   = allL.find(l=>l.work==='harvest')    || editLog;
    const fertLog = allL.find(l=>l.work==='fert')       || (editLog.work==='amend' ? {} : editLog);
    const pestLog = allL.find(l=>l.work==='pest')       || (editLog.work==='hormone' ? {} : editLog);
    const hormLog = allL.find(l=>l.work==='hormone')    || {};
    const amendLog = allL.find(l=>l.work==='amend')     || {};
    const discLog = allL.find(l=>l.work==='discard')    || editLog;
    const equipLog= allL.find(l=>l.work==='equip')      || editLog;
    const sowLog  = allL.find(l=>l.work==='sow'||l.work==='germinated') || editLog;
    const tplLog  = allL.find(l=>l.work==='transplant') || editLog;
    const eventLog= allL.find(l=>l.work==='event')      || editLog;
    const otherLog= allL.find(l=>l.work==='other')      || editLog;

    // 播種・発芽・定植
    setSowQty(sowLog.sowQty||"");
    const _germLog = allL.find(l=>l.germinationCnt||l.germinationDate) || sowLog;
    setGermCnt(_germLog.germinationCnt||"");
    if(_germLog.germinationDate) setGermDate(_germLog.germinationDate);
    const _repotLog = allL.find(l=>l.work==='repot');
    if(_repotLog){ setRepotSize(_repotLog.repotSize||""); setRepotVol(_repotLog.repotVol||""); }
    setTranspQty(tplLog.transplantQty||"");

    // 生育イベント
    setEventType(eventLog.eventType||"");
    setEventNote(eventLog.eventNote||"");

    // その他
    setOtherNote(otherLog.otherNote||"");

    // 施肥1件目 ─ fertNameで名前を復元、マスターIndexも復元
    setFertName(fertLog.fertName||"");
    setFertDil(fertLog.fertDil||"");
    setFertSprayAmt(fertLog.fertSprayAmt||"");
    setFertSprayUnit(fertLog.fertSprayUnit||"L");
    setFertAmt(fertLog.fertAmt||"");
    setFertUnit(fertLog.fertUnit||"kg");
    setFertMeth(fertLog.fertMethod||"追肥");
    setFertCost(fertLog.fertCost||"");
    // 施肥の追加エントリ復元
    const extraFerts = allL.filter(l=>l.work==='fert').slice(1);
    setFertEntries(extraFerts.map(l=>({name:l.fertName||"",dil:l.fertDil||"",sprayAmt:l.fertSprayAmt||"",sprayUnit:l.fertSprayUnit||"L",amt:l.fertAmt||"",unit:l.fertUnit||"kg",meth:l.fertMethod||"追肥",cost:l.fertCost||""})));

    // 農薬1件目 ─ pestNameで名前を復元、マスターIndexも復元
    const _pIdx = pestMs.findIndex(p=>p.name===pestLog.pestName);
    setPestIdx(_pIdx>=0 ? String(_pIdx) : "");
    setPestName(pestLog.pestName||"");
    setPestDil(pestLog.pestDil||"");
    setPestAmt(pestLog.pestAmt||"");
    setPestUnit(pestLog.pestUnit||"L");
    setPestSprayAmt(pestLog.pestSprayAmt||"");
    setPestTgt(pestLog.pestTarget||"");
    setPestCost(pestLog.pestCost||"");
    // 農薬の追加エントリ復元
    const extraPests = allL.filter(l=>l.work==='pest').slice(1);
    setPestEntries(extraPests.map(l=>({name:l.pestName||"",dil:l.pestDil||"",sprayAmt:l.pestAmt||"",sprayUnit:l.pestUnit||"L",tgt:l.pestTarget||"",cost:l.pestCost||""})));
    // ホルモン処理の復元（1件目＋追加分）
    setHormName(hormLog.pestName||"");
    setHormDil(hormLog.pestDil||"");
    setHormAmt(hormLog.pestAmt||"");
    setHormUnit(hormLog.pestUnit||"L");
    setHormTgt(hormLog.pestTarget||"");
    setAmendName(amendLog.fertName||"");
    setAmendAmt(amendLog.fertAmt||"");
    setAmendUnit(amendLog.fertUnit||"kg");
    setAmendEntries(allL.filter(l=>l.work==='amend').slice(1).map(l=>({name:l.fertName||"",amt:l.fertAmt||"",unit:l.fertUnit||"kg"})));
    setHormEntries(allL.filter(l=>l.work==='hormone').slice(1).map(l=>({name:l.pestName||"",dil:l.pestDil||"",sprayAmt:l.pestAmt||"",sprayUnit:l.pestUnit||"L",tgt:l.pestTarget||""})));

    // 収穫
    setHvKg(hvLog.hvKg||"");
    setHvCnt(hvLog.hvCnt||"");
    setHvQ(hvLog.hvQ||"秀品");
    setHvPrice(hvLog.hvPrice||"");
    {
      const grades=['秀品','優品','良品','規格外'];
      const restored={};
      grades.forEach(g=>{restored[g]={kg:'',cnt:'',price:''};});
      if(hvLog.hvGradeStr){
        hvLog.hvGradeStr.split('/').forEach(s=>{
          const s2=s.trim();
          const grade=grades.find(g=>s2.startsWith(g));
          if(grade){
            const kgM=s2.match(/([0-9.]+)\s*kg/);
            const cntM=s2.match(/([0-9]+)\s*個/);
            if(kgM)restored[grade].kg=kgM[1];
            if(cntM)restored[grade].cnt=cntM[1];
          }
        });
      } else {
        const q=hvLog.hvQ&&grades.includes(hvLog.hvQ)?hvLog.hvQ:'秀品';
        restored[q].kg=hvLog.hvKg||'';
        restored[q].cnt=hvLog.hvCnt||'';
        restored[q].price=hvLog.hvPrice||'';
      }
      setHvGrades(restored);
    }

    // 廃棄
    setDiscardCnt(discLog.discardCnt||"");
    setAddCnt(discLog.addCnt||"");

    // 資材作業 ─ equipIdsからインデックスを復元
    // equipActから純粋な作業種別のみを復元（資材名が混入している場合を除去）
    const _equipActs=["設置","撤去","使用","着用","脱去","点検","修理","その他"];
    const _rawAct=equipLog.equipAct||"設置";
    const _pureAct=_equipActs.find(a=>_rawAct===a||_rawAct.endsWith(" "+a))||_rawAct;
    setEquipAct(_pureAct);
    setEquipUseAmt(equipLog.equipUseAmt||"");
    setEquipUseUnit(equipLog.equipUseUnit||"L");
    setEquipUseAmt(equipLog.equipUseAmt||"");
    setEquipUseUnit(equipLog.equipUseUnit||"L");
    const _eIds = Array.isArray(equipLog.equipIds) ? equipLog.equipIds
                : (equipLog.equipIds ? JSON.parse(equipLog.equipIds) : []);
    setEquipSel(_eIds.length>0 ? [_eIds[0]] : []);
    // 資材の追加エントリ復元
    const extraEquips = allL.filter(l=>l.work==='equip').slice(1);
    setEquipEntries(extraEquips.map(l=>{
      const ids=Array.isArray(l.equipIds)?l.equipIds:(l.equipIds?JSON.parse(l.equipIds):[]);
      const _pureAct2=_equipActs.find(a=>l.equipAct===a||l.equipAct.endsWith(" "+a))||"設置";
      return {_id:l.id, idx:ids.length>0?ids[0]:"", act:_pureAct2, useAmt:l.equipUseAmt||"", useUnit:l.equipUseUnit||"L"};
    }));

    // 既存写真をプレビューとして保持
    if(editLog.imgSrc)  setLogImg({ base64:editLog.imgSrc,  blob:null, name:"", existing:true });
    else setLogImg(null);
    if(editLog.imgSrc2) setLogImg2({ base64:editLog.imgSrc2, blob:null, name:"", existing:true });
    else setLogImg2(null);
    if(editLog.imgSrc3) setLogImg3({ base64:editLog.imgSrc3, blob:null, name:"", existing:true });
    else setLogImg3(null);
  },[editLog, editLogs]);

  

  const doSave = async () => {
    setSaving(true);
    // 写真アップロード（編集時は既存URLをデフォルトとして保持）
    let imgUrl  = editId ? (editLog?.imgSrc ||null) : null;
    let imgUrl2 = editId ? (editLog?.imgSrc2||null) : null;
    let imgUrl3 = editId ? (editLog?.imgSrc3||null) : null;
    if(logImg){
      if(logImg.existing) imgUrl=logImg.base64;
      else if(logImg.blob&&uid) try{
        imgUrl=await uploadPhoto(logImg.blob,uid,logImg.name||uid0()+'.jpg');
        if(!imgUrl){ console.error('img1 upload returned null'); imgUrl=logImg.base64||null; }
      }catch(e){ console.error('img1 upload error:',e); imgUrl=logImg.base64||null; }
    }
    if(logImg2){
      if(logImg2.existing) imgUrl2=logImg2.base64;
      else if(logImg2.blob&&uid) try{ imgUrl2=await uploadPhoto(logImg2.blob,uid,logImg2.name||uid0()+'.jpg'); }catch(e){console.error('img2:',e);}
    }
    if(logImg3){
      if(logImg3.existing) imgUrl3=logImg3.base64;
      else if(logImg3.blob&&uid) try{ imgUrl3=await uploadPhoto(logImg3.blob,uid,logImg3.name||uid0()+'.jpg'); }catch(e){console.error('img3:',e);}
    }

    // 作業リスト（複数選択対応）
    const workList = works.size>0 ? [...works] : ['other'];

    // 収穫データ計算
    const hvGradeEntries = Object.entries(hvGrades).filter(([,v])=>v.kg||v.cnt);
    const totalHvKg = hvGradeEntries.reduce((s,[,v])=>s+(parseFloat(v.kg)||0),0);
    const totalHvCnt = hvGradeEntries.reduce((s,[,v])=>s+(parseInt(v.cnt)||0),0);
    const gradeStr = hvGradeEntries.map(([q,v])=>q+':'+(v.kg?v.kg+'kg':'')+(v.cnt?v.cnt+'個':'')).join(' / ');

    // 各作業のエントリを生成する関数
    const makeEntry = (w, isFirst, existingId, groupId) => {
      const e = {
        id: existingId || uid0(),
        _groupId: groupId || null,
        fieldIdx, cropId, date, time, duration:dur, work:w,
        // メモ・写真は1件目のみ
        memo: isFirst ? memo : '',
        imgSrc: isFirst ? imgUrl||null : null,
        imgSrc2: isFirst ? imgUrl2||null : null,
        imgSrc3: isFirst ? imgUrl3||null : null,
        // 共通データ（全作業）
        sowQty:'', germinationCnt:'', germinationDate:'',
        transplantQty:'', discardCnt:'', addCnt:'',
        eventType:'', eventNote:'',
        fertName:'', fertDil:'', fertSprayAmt:'', fertSprayUnit:'', fertAmt:'', fertUnit:'', fertMethod:'', fertCost:'',
        pestName:'', pestDil:'', pestAmt:'', pestUnit:'', pestTarget:'', pestCost:'',
        hvKg:'', hvCnt:'', hvQ:'秀品', hvPrice:'', hvGradeStr:'',
        equipIds:[], equipAct:'',
      };
      // 作業固有の詳細データ
      if(w==='fert') Object.assign(e,{fertName,fertDil,fertSprayAmt,fertSprayUnit,fertAmt,fertUnit,fertMethod:fertMeth,fertCost});
      if(w==='pest') Object.assign(e,{pestName,pestDil,pestAmt,pestUnit,pestSprayAmt,pestTarget:pestTgt,pestCost});
      if(w==='amend') Object.assign(e,{fertName:amendName,fertAmt:amendAmt,fertUnit:amendUnit});
      if(w==='hormone') Object.assign(e,{pestName:hormName,pestDil:hormDil,pestAmt:hormAmt,pestUnit:hormUnit,pestTarget:hormTgt});
      if(w==='harvest') Object.assign(e,{
        hvKg:hvGradeEntries.length>0?(totalHvKg>0?String(totalHvKg):''):hvKg,
        hvCnt:hvGradeEntries.length>0?(totalHvCnt>0?String(totalHvCnt):''):hvCnt,
        hvQ:hvGradeEntries.length>1?'品質別':hvGradeEntries.length===1?hvGradeEntries[0][0]:hvQ,
        hvPrice, hvGradeStr:hvGradeEntries.length>0?gradeStr:'',
      });
      if(w==='equip') {
        // equip_actに「資材名 作業種別」を結合して保存
        const _en=equipSel.map(i=>equips[i]?.name).filter(Boolean);
        const _fa=(_en.join('・')+(_en.length?' ':'')+equipAct).trim();
        Object.assign(e,{equipIds:equipSel, equipAct:_fa||equipAct, equipUseAmt:equipUseAmt||null, equipUseUnit:equipUseUnit||null});
      }
      if(w==='discard') Object.assign(e,{discardCnt,addCnt});
      if(w==='sow') Object.assign(e,{sowQty,germinationCnt:germCnt,germinationDate:germDate});
      if(w==='germinated') Object.assign(e,{germinationCnt:germCnt,germinationDate:germDate});
      if(w==='transplant') Object.assign(e,{transplantQty:transpQty});
      if(w==='repot') Object.assign(e,{repotSize,repotVol});
      if(w==='event') Object.assign(e,{eventType,eventNote});
      if(w==='other') Object.assign(e,{otherNote});
      return e;
    };

    if(editId) {
      // 編集: editLogsの各IDをworkListに対応
      // editLogsが不完全な場合（group化できていない）、logsから同じgroupIdで補完
      const _rawEditLogs = (editLogs&&editLogs.length>0) ? editLogs : [editLog];
      const _gid = _rawEditLogs[0]?._groupId;
      const _fullEditLogs = _gid
        ? logs.filter(l=>l._groupId===_gid)
        : _rawEditLogs;
      const editLogIds = (_fullEditLogs.length>0 ? _fullEditLogs : _rawEditLogs).map(l=>l.id);
      // 既存ログを削除してから再追加
      // editLogIds + 同じgroupIdを持つ全ログも削除対象に（groupが不完全に渡された場合の保険）
      const editGroupIdForRemove = editLogIds[0]
        ? (logs.find(l=>l.id===editLogIds[0])?._groupId || null)
        : null;
      const removeIds = new Set([
        ...editLogIds,
        ...(editGroupIdForRemove
          ? logs.filter(l=>l._groupId===editGroupIdForRemove).map(l=>l.id)
          : [])
      ]);
      let allNewLogs = logs.filter(l=>!removeIds.has(l.id));
      // 編集: 施肥複数対応
      const editEntriesAll = [];
      const editGroupId = editLogIds[0] || uid0();
      let _idp = 0; const nextId = () => (_idp < editLogIds.length ? editLogIds[_idp++] : null); // 既存IDを順番に再利用
      for(let wi=0;wi<workList.length;wi++){
        const w=workList[wi];
        editEntriesAll.push(makeEntry(w, wi===0, nextId(), editGroupId));
        if(w==='fert' && fertEntries.length>0){
          fertEntries.forEach((fe,fi)=>{
            const ex=makeEntry('fert',false,nextId(),editGroupId);
            ex.fertName=fe.name;ex.fertDil=fe.dil||'';ex.fertSprayAmt=fe.sprayAmt||'';ex.fertSprayUnit=fe.sprayUnit||'L';ex.fertAmt=fe.amt;ex.fertUnit=fe.unit;ex.fertMethod=fe.meth;ex.fertCost=fe.cost;
            editEntriesAll.push(ex);
          });
        }
        if(w==='pest' && pestEntries.length>0){
          pestEntries.forEach((pe,pi)=>{
            const ex=makeEntry('pest',false,nextId(),editGroupId);
            ex.pestName=pe.name;ex.pestDil=pe.dil;ex.pestAmt=pe.sprayAmt;ex.pestUnit=pe.sprayUnit;ex.pestTarget=pe.tgt;ex.pestCost=pe.cost;
            editEntriesAll.push(ex);
          });
        }
        if(w==='amend' && amendEntries.length>0){
          amendEntries.forEach(ae=>{
            const ex=makeEntry('amend',false,nextId(),editGroupId);
            ex.fertName=ae.name;ex.fertAmt=ae.amt;ex.fertUnit=ae.unit;
            editEntriesAll.push(ex);
          });
        }
        if(w==='hormone' && hormEntries.length>0){
          hormEntries.forEach(he=>{
            const ex=makeEntry('hormone',false,nextId(),editGroupId);
            ex.pestName=he.name;ex.pestDil=he.dil;ex.pestAmt=he.sprayAmt;ex.pestUnit=he.sprayUnit;ex.pestTarget=he.tgt;
            editEntriesAll.push(ex);
          });
        }
        // 資材の追加エントリ（編集時も新規IDで追加）
        if(w==='equip' && equipEntries.length>0){
          equipEntries.forEach((ee,ei)=>{
            const ex=makeEntry('equip',false,nextId(),editGroupId);
            const _en2=ee.idx!==""?equips[ee.idx]?.name||'':'';
            const _fa2=(_en2+(_en2?' ':'')+ee.act).trim();
            ex.equipIds=ee.idx!==""?[ee.idx]:[];ex.equipAct=_fa2||ee.act;ex.equipUseAmt=ee.useAmt||null;ex.equipUseUnit=ee.useUnit||null;
            editEntriesAll.push(ex);
          });
        }
      }
      const newEntries = editEntriesAll;
      const displayEditEntries = newEntries.map((e,i)=>({
        ...e,
        imgSrc:  e.imgSrc  || (i===0 ? (logImg  ?.base64||editLog?.imgSrc ||null) : null),
        imgSrc2: e.imgSrc2 || (i===0 ? (logImg2 ?.base64||editLog?.imgSrc2||null) : null),
        imgSrc3: e.imgSrc3 || (i===0 ? (logImg3 ?.base64||editLog?.imgSrc3||null) : null),
      }));
      allNewLogs = [...allNewLogs, ...displayEditEntries];
      setLogsR(allNewLogs);
      // DB保存完了を待ってからtoast（完了前の再ロードで消えるのを防ぐ）
      await (async()=>{ for(const e of newEntries){ await dbSaveLog(e); } })();
      // 使わなくなった古いエントリだけDBから削除（再利用したIDは消さない）
      const _reused = new Set(newEntries.map(e=>e.id));
      [...removeIds].filter(id=>!_reused.has(id)).forEach(id=>dbDelete('logs',id));
      // 在庫：編集前との差分だけ反映
      const _oldLogs = logs.filter(l=>removeIds.has(l.id));
      applyStockDelta(diffUsage(stockUsageMap(newEntries,fertMs,pestMs), stockUsageMap(_oldLogs,fertMs,pestMs)), {fertMs,setFertMs,pestMs,setPestMs,showToast});
      // 費用更新（施肥/農薬）
      if(workList[0]==='fert'&&fertCost) {
        const existing=costs.find(co=>co.cropId===cropId&&co.cat==='fert'&&co.logId===editId);
        if(existing) setCosts(costs.map(co=>co.logId===editId?{...co,amt:fertCost}:co),{...existing,amt:fertCost});
      }
      if(workList[0]==='pest'&&pestCost) {
        const existing=costs.find(co=>co.cropId===cropId&&co.cat==='pest'&&co.logId===editId);
        if(existing) setCosts(costs.map(co=>co.logId===editId?{...co,amt:pestCost}:co),{...existing,amt:pestCost});
      }
      showToast('記録を更新しました！');
    } else {
      // 新規
      // 施肥は複数エントリ対応
      const baselist = [...workList];
      const allEntriesNew = [];
      const newGroupId = uid0(); // 同一作業グループの識別ID
      for(let wi=0;wi<baselist.length;wi++){
        const w=baselist[wi];
        const isFirst=wi===0;
        allEntriesNew.push(makeEntry(w, isFirst, null, newGroupId));
        // 施肥の追加エントリ
        if(w==='fert' && fertEntries.length>0){
          fertEntries.forEach(fe=>{
            const ex=makeEntry('fert',false,null,newGroupId);
            ex.fertName=fe.name;ex.fertDil=fe.dil||'';ex.fertSprayAmt=fe.sprayAmt||'';ex.fertSprayUnit=fe.sprayUnit||'L';ex.fertAmt=fe.amt;ex.fertUnit=fe.unit;ex.fertMethod=fe.meth;ex.fertCost=fe.cost;
            allEntriesNew.push(ex);
          });
        }
        // 農薬の追加エントリ
        if(w==='pest' && pestEntries.length>0){
          pestEntries.forEach(pe=>{
            const ex=makeEntry('pest',false,null,newGroupId);
            ex.pestName=pe.name;ex.pestDil=pe.dil;ex.pestAmt=pe.sprayAmt;ex.pestUnit=pe.sprayUnit;ex.pestTarget=pe.tgt;ex.pestCost=pe.cost;
            allEntriesNew.push(ex);
          });
        }
        // 土壌改良の追加エントリ
        if(w==='amend' && amendEntries.length>0){
          amendEntries.forEach(ae=>{
            const ex=makeEntry('amend',false,null,newGroupId);
            ex.fertName=ae.name;ex.fertAmt=ae.amt;ex.fertUnit=ae.unit;
            allEntriesNew.push(ex);
          });
        }
        // ホルモン処理の追加エントリ
        if(w==='hormone' && hormEntries.length>0){
          hormEntries.forEach(he=>{
            const ex=makeEntry('hormone',false,null,newGroupId);
            ex.pestName=he.name;ex.pestDil=he.dil;ex.pestAmt=he.sprayAmt;ex.pestUnit=he.sprayUnit;ex.pestTarget=he.tgt;
            allEntriesNew.push(ex);
          });
        }
        // 資材の追加エントリ
        if(w==='equip' && equipEntries.length>0){
          equipEntries.forEach(ee=>{
            const ex=makeEntry('equip',false,null,newGroupId);
            const _en2=ee.idx!==""?equips[ee.idx]?.name||'':'';
            const _fa2=(_en2+(_en2?' ':'')+ee.act).trim();
            ex.equipIds=ee.idx!==""?[ee.idx]:[];ex.equipAct=_fa2||ee.act;ex.equipUseAmt=ee.useAmt||null;ex.equipUseUnit=ee.useUnit||null;
            allEntriesNew.push(ex);
          });
        }
      }
      const newEntries = allEntriesNew;
      // ローカル表示用: imgUrlがnullの場合はbase64プレビューを使う
      const displayEntries = newEntries.map((e,i)=>({
        ...e,
        imgSrc:  e.imgSrc  || (i===0 ? logImg  ?.base64||null : null),
        imgSrc2: e.imgSrc2 || (i===0 ? logImg2 ?.base64||null : null),
        imgSrc3: e.imgSrc3 || (i===0 ? logImg3 ?.base64||null : null),
      }));
      const allNewLogs = [...logs, ...displayEntries];
      setLogsR(allNewLogs);
      // DB保存完了を待ってからtoast（完了前の再ロードで消えるのを防ぐ）
      await (async()=>{ for(const e of newEntries){ await dbSaveLog(e); } })();
      // 費用自動追加（施肥/農薬）
      if(workList[0]==='fert'&&fertName&&fertCost&&cropId) {
        const fc={id:uid0(),cat:'fert',cropId,name:fertName,amt:fertCost,date,qty:'1',qunit:'式',fieldIdx,fieldId:fields[fieldIdx]?.id||'',logId:newEntries[0].id,note:''};
        setCosts([...costs,fc],fc);
      }
      if(workList[0]==='pest'&&pestName&&pestCost&&cropId) {
        const pc={id:uid0(),cat:'pest',cropId,name:pestName,amt:pestCost,date,qty:'1',qunit:'式',fieldIdx,fieldId:fields[fieldIdx]?.id||'',logId:newEntries[0].id,note:''};
        setCosts([...costs,pc],pc);
      }
      // 定植日更新
      if(workList.includes('transplant')&&cropId&&date) {
        const updatedCrops=crops.map(c=>c.id===cropId&&!c.plantDate?{...c,plantDate:date}:c);
        if(JSON.stringify(updatedCrops)!==JSON.stringify(crops)){
          const changed=updatedCrops.find(c=>c.id===cropId);
          setCrops(updatedCrops,changed);
        }
      }
      // 在庫自動減算（新規・コピー保存時）：チェックした作業の資材だけ、保存した記録から計算
      applyStockDelta(stockUsageMap(newEntries,fertMs,pestMs), {fertMs,setFertMs,pestMs,setPestMs,showToast});
      showToast('記録しました！');
    }
    setSaving(false);
    const kd=keepDate,kc=keepCrop,kf=keepField;
    setWorks(new Set());setMemo('');setLogImg(null);setLogImg2(null);setLogImg3(null);
    setHvGrades({秀品:{kg:'',cnt:'',price:''},優品:{kg:'',cnt:'',price:''},良品:{kg:'',cnt:'',price:''},規格外:{kg:'',cnt:'',price:''}});
    setHvKg('');setHvCnt('');setHvQ('秀品');setHvPrice('');
    setSowQty('');setGermCnt('');setTranspQty('');
    setFertName('');setFertAmt('');setPestName('');setPestDil('');setPestAmt('');
    setFertEntries([]);setPestEntries([]);setEquipEntries([]);setFertDil('');setFertSprayAmt('');setFertCost('');setPestCost('');setPestTgt('');setPestSprayAmt('');
    setHormName('');setHormDil('');setHormAmt('');setHormUnit('L');setHormTgt('');setHormEntries([]);
    setAmendName('');setAmendAmt('');setAmendUnit('kg');setAmendEntries([]);
    setGermDate(todayStr());setRepotSize('');setRepotVol('');setOtherNote('');setEquipUseAmt('');
    setDiscardCnt('');setAddCnt('');setEquipSel([]);setEquipAct('設置');
    setEventType('');setEventNote('');setDur('');
    if(kd){setDate(kd);setCropId(kc);if(kf!==null)setFieldIdx(kf);}
    setKeepDate('');setKeepCrop('');setKeepField(null);
    if(!kd&&onDone) setTimeout(()=>onDone(),600);
  };

  
  const panelStyle = (bg,bc) => ({...S.card,background:bg,borderColor:bc,marginBottom:7});
  const ctitleStyle = {fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8};
  // 親コンポーネントからdoSaveを呼べるようにrefに登録
  useEffect(()=>{
    if(saveRef) saveRef.current = doSave;
  });

  const fieldCrops = crops.filter(c=>c.fieldIdx===fieldIdx);
  const cropObj    = crops.find(c=>c.id===cropId)||{};
  const cropDb     = CDB[cropObj.type]||{};
  const eventOpts  = cropDb.events||["開花","着果","収穫開始","生育確認","異常発生","その他"];

  // 写真一括選択（1枚目からEXIF取得、最大3枚）
  const handleLogImg = async e => {
    const allFiles = Array.from(e.target.files);
    // 既存の枚数と合わせて3枚を超えないように
    const existing = [logImg, logImg2, logImg3].filter(Boolean).length;
    const room = 3 - existing;
    if(room <= 0){ showToast("写真は3枚までです"); e.target.value=""; return; }
    if(allFiles.length > room){ showToast(`あと${room}枚まで選択できます`); e.target.value=""; return; }
    const files = allFiles.slice(0, room);
    if(!files.length) return;
    // 全ファイルのEXIF撮影日時を取得し、最も早いものを採用
    let earliest = null;
    for(const f of files){
      const ex = await extractExifDate(f);
      if(ex){
        const dt = new Date(ex.date + "T" + (ex.time||"00:00"));
        if(!earliest || dt < earliest.dt) earliest = {dt, date:ex.date, time:ex.time};
      }
    }
    if(earliest){ setDate(earliest.date); setTime(earliest.time); showToast("写真から日時を取得しました（最も早い撮影日時）"); }
    // 空いているスロットに順番に入れる
    const slots = [[logImg,setLogImg],[logImg2,setLogImg2],[logImg3,setLogImg3]];
    let fi = 0;
    for(const [cur,setter] of slots){
      if(cur) continue;
      if(fi >= files.length) break;
      const {base64,blob} = await compressImage(files[fi]);
      const finalBlob = blob || await fetch(base64).then(r=>r.blob());
      setter({base64, blob:finalBlob, name:uid0()+'-'+Date.now()+'-'+fi+".jpg"});
      fi++;
    }
    e.target.value="";
  };
  const handleLogImg2 = async e => {
    const f=e.target.files[0]; if(!f) return;
    const {base64,blob} = await compressImage(f);
    setLogImg2({base64,blob,name:uid0()+".jpg"});
  };
  const handleLogImg3 = async e => {
    const f=e.target.files[0]; if(!f) return;
    const {base64,blob} = await compressImage(f);
    setLogImg3({base64,blob,name:uid0()+".jpg"});
  };

  const doSaveAndAdd = () => {
    setKeepDate(date);
    setKeepCrop(cropId);
    setKeepField(fieldIdx);
    doSave();
  };

    return (
    <div style={S.scr} className="scr-inner">
      <div style={S.sec}>
        <span>作業内容を選択してください</span>
        {(works.size>0||editId) && (
          <button onClick={()=>{setEditId(null);setWork("");setMemo("");setLogImg(null);setLogImg2(null);setLogImg3(null);setHvGrades({秀品:{kg:"",cnt:"",price:""},優品:{kg:"",cnt:"",price:""},良品:{kg:"",cnt:"",price:""},規格外:{kg:"",cnt:"",price:""}});setDate(todayStr());setTime(nowTime());setDur("");setSowQty("");setGermCnt("");setGermDate(todayStr());setTranspQty("");setFertIdx("");setFertName("");setFertAmt("");setFertUnit("kg");setFertMeth("追肥");setFertCost("");setPestIdx("");setPestName("");setPestDil("");setPestAmt("");setPestUnit("L");setPestTgt("");setPestCost("");setDiscardCnt("");setAddCnt("");setEventType("");setEventNote("");setOtherNote("");setHvKg("");setHvCnt("");setHvQ("秀品");setHvPrice("");setRepotSize("");setRepotVol("");setEquipSel([]);setEquipAct("設置");setEquipUseAmt("");setEquipUseUnit("L");setEquipEntries([]);setWork("");setCropId("");}}
            style={{...S.btn,...S.btnS,...S.btnSm}}>✕ リセット</button>
        )}
      </div>
      <div style={S.card}>
        <R2>
          <FG label="圃場">{fields.length>0?<Sel value={fieldIdx} onChange={v=>{setFieldIdx(parseInt(v));setCropId("");}} options={fields.map((f,i)=>({value:i,label:f.name}))}/>:<div style={{color:TX3,fontSize:".82rem"}}>圃場を登録してください</div>}</FG>
          <FG label="品目"><Sel value={cropId} onChange={setCropId} options={makeCropOptions(fieldCrops.filter(c=>!c.ended))} /></FG>
        </R2>
        <FG label="作業内容">
          <div style={{fontSize:".7rem",color:"#888",marginBottom:4}}>💡 複数選択できます</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
            {WORK_TYPES.filter(w=>!w.hidden||works.has(w.value)).map(w=>(
              <button key={w.value} onClick={()=>toggleWork(w.value)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"7px 4px",border:"2px solid "+(works.has(w.value)?G2:BD),borderRadius:10,background:works.has(w.value)?G3:"#fff",fontSize:".62rem",fontWeight:700,color:works.has(w.value)?G:"#5a5040",cursor:"pointer"}}>
                <span style={{fontSize:"1.3rem",lineHeight:1}}>{w.icon}</span><TermTooltip>{w.label}</TermTooltip>
              </button>
            ))}
          </div>
        </FG>
        {works.has("sow")&&<div style={panelStyle("#f0fdf4","#86efac")}>
          <div style={ctitleStyle}>🌰 播種詳細</div>
          <FG label="播種量（粒数・個数）"><CalcInp value={sowQty} onChange={setSowQty} placeholder="例：300"/></FG>
        </div>}
        {works.has("germinated")&&<div style={panelStyle("#f0fdf4","#86efac")}><div style={ctitleStyle}>🌱 発芽確認</div><R2><FG label="発芽確認数"><CalcInp value={germCnt} onChange={setGermCnt} placeholder="例：250"/></FG><FG label="確認日"><Inp type="date" value={germDate} onChange={setGermDate}/></FG></R2>{sowQty&&germCnt&&<div style={{fontSize:".8rem",color:G,marginTop:4}}>発芽率: {Math.round((parseInt(germCnt)/parseInt(sowQty))*100)}%</div>}</div>}
        {works.has("transplant")&&<div style={panelStyle("#f5f3ff","#c4b5fd")}>
          <div style={ctitleStyle}>🪴 定植詳細</div>
          <FG label="定植株数"><CalcInp value={transpQty} onChange={setTranspQty} placeholder="例：120"/></FG>
        </div>}
        {works.has("repot")&&<div style={panelStyle("#f5f3ff","#c4b5fd")}>
          <div style={ctitleStyle}>🪴 植え替え詳細</div>
          <R2>
            <FG label="新しい鉢サイズ（号）">
              <Sel value={repotSize} onChange={v=>{setRepotSize(v);const vl={3:0.25,4:0.8,5:1.5,6:2.5,7:3.5,8:5,9:7,10:10,11:13,12:16,13:20,15:25,18:35,21:50,24:70}[parseInt(v)];if(vl)setRepotVol(String(vl));}}
                options={[{value:"",label:"（選択）"},...[3,4,5,6,7,8,9,10,11,12,13,15,18,21,24].map(n=>({value:String(n),label:n+"号"}))]}/>
            </FG>
            <FG label="容量（L）">
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <CalcInp value={repotVol} onChange={setRepotVol} placeholder="自動入力"/>
                <span style={{fontSize:".8rem",color:TX3,whiteSpace:"nowrap"}}>L</span>
              </div>
            </FG>
          </R2>
        </div>}
        {works.has("event")&&<div style={panelStyle("#fff7ed","#fdba74")}><div style={ctitleStyle}>📋 生育イベント</div><FG label="イベント種別"><Sel value={eventType} onChange={setEventType} options={[{value:"",label:"選択してください"},...eventOpts.map(v=>({value:v,label:v}))]}/></FG><FG label="メモ"><Inp value={eventNote} onChange={setEventNote} placeholder="例：1番花開花、受粉実施"/></FG></div>}
        {works.has("fert")&&<div style={panelStyle("#f9fff9","#b2dfdb")}>
          <div style={{...ctitleStyle,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🌿 施肥詳細</span>
            <button onClick={()=>setFertEntries(prev=>[...prev,emptyFert()])}
              style={{...S.btn,...S.btnSm,background:G,color:"#fff",fontSize:".72rem"}}>＋ 資材追加</button>
          </div>          <div style={{background:"#fffdf5",border:"1px solid #b2dfdb",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <div style={{fontSize:".72rem",fontWeight:700,color:"#2d6a3f",marginBottom:5}}>資材 1</div>
            <FG label="肥料名">
              <Sel value={fertName} onChange={v=>{
                setFertName(v);
                const fm=fertMs.find(f=>f.name===v);
                if(fm){if(masterUnitOf(fm))setFertUnit(masterUnitOf(fm));if(fm.dil)setFertDil(fm.dil);}
              }} options={[{value:"",label:"（選択）"},...fertMs.filter(f=>f.status!=="使い切り（非表示）").map(f=>({value:f.name,label:f.name}))]}/>
            </FG>
            <R2>
              <FG label="施用方法"><Sel value={fertMeth} onChange={setFertMeth} options={["元肥","追肥","葉面散布","かん注","液肥希釈"].map(v=>({value:v,label:v}))}/></FG>
              {(()=>{ const fa=fertAutoOf(fertMeth,fertDil,fertSprayAmt,fertSprayUnit,fertName); return (
              <FG label={fa?"原液量（自動計算）":"施用量（原液）"}>
                <div style={{display:"flex",gap:4}}>
                  {fa
                    ? <><div style={{...S.inp,flex:1,background:"#f0fdf4",color:"#065f46",cursor:"default",fontWeight:600}}>{fa.amt}</div>
                        <div style={{...S.inp,width:60,flex:"none",background:"#f0fdf4",color:"#065f46",cursor:"default",textAlign:"center"}}>{fa.unit}</div></>
                    : <><CalcInp value={fertAmt} onChange={setFertAmt} style={{flex:1}}/>
                        <Sel value={fertUnit} onChange={setFertUnit} options={[...new Set(["kg","g","L","ml","袋",fertUnit].filter(Boolean))].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></>}
                </div>
                {fa&&fertName&&<div style={{fontSize:".68rem",color:"#059669",marginTop:2}}>💧 原液 {fa.amt}{fa.unit} → 在庫から差し引きます</div>}
              </FG>); })()}
            </R2>
            {isDilMeth(fertMeth)&&<R2>
              <FG label="希釈倍数"><CalcInp value={fertDil} onChange={setFertDil} placeholder="500"/></FG>
              <FG label="散布量（希釈後）"><div style={{display:"flex",gap:4}}><CalcInp value={fertSprayAmt} onChange={setFertSprayAmt} style={{flex:1}}/><Sel value={fertSprayUnit} onChange={setFertSprayUnit} options={["L","ml"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
            </R2>}
          </div>          {fertEntries.map((fe,fi)=>(
            <div key={fi} style={{background:"#fffdf5",border:"1px solid #b2dfdb",borderRadius:8,padding:"8px 10px",marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:".72rem",fontWeight:700,color:"#2d6a3f"}}>資材 {fi+2}</span>
                <button onClick={()=>setFertEntries(prev=>prev.filter((_,i)=>i!==fi))}
                  style={{...S.btn,...S.btnR,...S.btnSm,fontSize:".65rem",padding:"2px 8px"}}>✕</button>
              </div>
              <FG label="肥料名">
                <Sel value={fe.name} onChange={v=>{
                  setFertEntries(p=>p.map((x,i)=>i===fi?{...x,name:v}:x));
                  const fm2=fertMs.find(f=>f.name===v);
                  if(fm2)setFertEntries(p=>p.map((x,i)=>i===fi?{...x,unit:masterUnitOf(fm2)||x.unit,dil:fm2.dil||x.dil}:x));
                }} options={[{value:"",label:"（選択）"},...fertMs.filter(f=>f.status!=="使い切り（非表示）").map(f=>({value:f.name,label:f.name}))]}/>
              </FG>
              <R2>
                <FG label="施用方法"><Sel value={fe.meth} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,meth:v}:x))} options={["元肥","追肥","葉面散布","かん注","液肥希釈"].map(v=>({value:v,label:v}))}/></FG>
                {(()=>{ const fa=fertAutoOf(fe.meth,fe.dil,fe.sprayAmt,fe.sprayUnit,fe.name); return (
                <FG label={fa?"原液量（自動計算）":"施用量（原液）"}>
                  <div style={{display:"flex",gap:4}}>
                    {fa
                      ? <><div style={{...S.inp,flex:1,background:"#f0fdf4",color:"#065f46",cursor:"default",fontWeight:600}}>{fa.amt}</div>
                          <div style={{...S.inp,width:60,flex:"none",background:"#f0fdf4",color:"#065f46",cursor:"default",textAlign:"center"}}>{fa.unit}</div></>
                      : <><CalcInp value={fe.amt} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,amt:v}:x))} style={{flex:1}}/>
                          <Sel value={fe.unit} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,unit:v}:x))} options={[...new Set(["kg","g","L","ml","袋",fe.unit].filter(Boolean))].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></>}
                  </div>
                  {fa&&fe.name&&<div style={{fontSize:".68rem",color:"#059669",marginTop:2}}>💧 原液 {fa.amt}{fa.unit} → 在庫から差し引きます</div>}
                </FG>); })()}
              </R2>
              {isDilMeth(fe.meth)&&<R2>
                <FG label="希釈倍数"><CalcInp value={fe.dil} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,dil:v}:x))} placeholder="500"/></FG>
                <FG label="散布量（希釈後）"><div style={{display:"flex",gap:4}}><CalcInp value={fe.sprayAmt} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,sprayAmt:v}:x))} style={{flex:1}}/><Sel value={fe.sprayUnit||"L"} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,sprayUnit:v}:x))} options={["L","ml"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
              </R2>}
            </div>
          ))}
        </div>}
        {works.has("pest")&&<div style={panelStyle("#fffdf0","#f9e4a0")}>
          <div style={{...ctitleStyle,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🐛 防除</span>
            <button onClick={()=>setPestEntries(prev=>[...prev,emptyPest()])}
              style={{...S.btn,...S.btnSm,background:"#d97706",color:"#fff",fontSize:".72rem"}}>＋ 追加</button>
          </div>
          <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:".72rem",color:"#856404",lineHeight:1.6}}>
            ⚠️ 農薬の使用記録は農薬取締法により保管義務があります。本アプリの記録は補助的なものです。法的義務の履行は別途ご確認ください。
          </div>
          <div style={{background:"#fffaf0",border:"1px solid #f9e4a0",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <div style={{fontSize:".72rem",fontWeight:700,color:"#92400e",marginBottom:5}}>農薬 1</div>
            <FG label="農薬を選ぶ">
              <Sel value={pestMs.findIndex(p=>p.name===pestName)} onChange={v=>{if(v===""){setPestName("");}else{const pm=pestMs[parseInt(v)];if(pm){setPestName(pm.name);if(pm.dil)setPestDil(pm.dil);}}}}
                options={[{value:"",label:"（選択）"},...pestMs.map((p,i)=>({value:i,label:p.name})).filter((_,i)=>pestMs[i]?.status!=="使い切り（非表示）" && !isHormoneMaster(pestMs[i]))]}/>
            </FG>
            <R2>
              <FG label="希釈倍数"><CalcInp value={pestDil} onChange={setPestDil} placeholder="1000"/></FG>
              <FG label="散布量"><div style={{display:"flex",gap:4}}><CalcInp value={pestAmt} onChange={setPestAmt} style={{flex:1}}/><Sel value={pestUnit} onChange={setPestUnit} options={["L","ml","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
            </R2>
            {(()=>{ const pc=pestConcOf(pestName,pestDil,pestAmt,pestUnit); return pc?(
              <FG label="原液量（自動計算）">
                <div style={{display:"flex",gap:4}}>
                  <div style={{...S.inp,flex:1,background:"#f0fdf4",color:"#065f46",cursor:"default",fontWeight:600}}>{pc.amt}</div>
                  <div style={{...S.inp,width:60,flex:"none",background:"#f0fdf4",color:"#065f46",cursor:"default",textAlign:"center"}}>{pc.unit}</div>
                </div>
                {pestName&&<div style={{fontSize:".68rem",color:"#059669",marginTop:2}}>💧 原液 {pc.amt}{pc.unit} → 在庫から差し引きます</div>}
              </FG>):null; })()}
            <FG label="対象病害虫"><Inp value={pestTgt} onChange={setPestTgt} placeholder="アブラムシ等"/></FG>
          </div>
          {pestEntries.map((pe,pi)=>(
            <div key={pi} style={{background:"#fffaf0",border:"1px solid #f9e4a0",borderRadius:8,padding:"8px 10px",marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:".72rem",fontWeight:700,color:"#92400e"}}>農薬 {pi+2}</span>
                <button onClick={()=>setPestEntries(prev=>prev.filter((_,i)=>i!==pi))}
                  style={{...S.btn,...S.btnR,...S.btnSm,fontSize:".65rem",padding:"2px 8px"}}>✕</button>
              </div>
              <FG label="農薬を選ぶ">
                <Sel value={pe.name?pestMs.findIndex(p=>p.name===pe.name):""} onChange={v=>{
                  if(v===""){setPestEntries(p=>p.map((x,i)=>i===pi?{...x,name:""}:x));}
                  else{const pm=pestMs[parseInt(v)];setPestEntries(p=>p.map((x,i)=>i===pi?{...x,name:pm.name,dil:pm.dil||x.dil}:x));}
                }} options={[{value:"",label:"（選択）"},...pestMs.map((p,i)=>({value:i,label:p.name})).filter((_,i)=>pestMs[i]?.status!=="使い切り（非表示）" && !isHormoneMaster(pestMs[i]))]}/>
              </FG>
              <R2>
                <FG label="希釈倍数"><CalcInp value={pe.dil} onChange={v=>setPestEntries(p=>p.map((x,i)=>i===pi?{...x,dil:v}:x))} placeholder="1000"/></FG>
                <FG label="散布量"><div style={{display:"flex",gap:4}}><CalcInp value={pe.sprayAmt} onChange={v=>setPestEntries(p=>p.map((x,i)=>i===pi?{...x,sprayAmt:v}:x))} style={{flex:1}}/><Sel value={pe.sprayUnit||"L"} onChange={v=>setPestEntries(p=>p.map((x,i)=>i===pi?{...x,sprayUnit:v}:x))} options={["L","ml","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
              </R2>
              {(()=>{ const pc=pestConcOf(pe.name,pe.dil,pe.sprayAmt,pe.sprayUnit); return pc?(
                <FG label="原液量（自動計算）">
                  <div style={{display:"flex",gap:4}}>
                    <div style={{...S.inp,flex:1,background:"#f0fdf4",color:"#065f46",cursor:"default",fontWeight:600}}>{pc.amt}</div>
                    <div style={{...S.inp,width:60,flex:"none",background:"#f0fdf4",color:"#065f46",cursor:"default",textAlign:"center"}}>{pc.unit}</div>
                  </div>
                  {pe.name&&<div style={{fontSize:".68rem",color:"#059669",marginTop:2}}>💧 原液 {pc.amt}{pc.unit} → 在庫から差し引きます</div>}
                </FG>):null; })()}
              <FG label="対象病害虫"><Inp value={pe.tgt} onChange={v=>setPestEntries(p=>p.map((x,i)=>i===pi?{...x,tgt:v}:x))} placeholder="アブラムシ等"/></FG>
            </div>
          ))}
        </div>}
        {works.has("soil")&&<div style={panelStyle("#f9fafb","#d1d5db")}>
          <div style={ctitleStyle}>🚜 土づくり</div>
          <div style={{fontSize:".72rem",color:"#555",lineHeight:1.6}}>耕うん・畝立て・マルチ張りなど、定植前の畑の準備です。内容はメモに書いておくと後で見返せます。堆肥や石灰を入れたときは「土壌改良」も一緒に選んでください。</div>
        </div>}
        {works.has("amend")&&<div style={panelStyle("#f0fdfa","#5eead4")}>
          <div style={{...ctitleStyle,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🧱 土壌改良（堆肥・石灰など）</span>
            <button onClick={()=>setAmendEntries(prev=>[...prev,emptyAmend()])}
              style={{...S.btn,...S.btnSm,background:"#0f766e",color:"#fff",fontSize:".72rem"}}>＋ 追加</button>
          </div>
          <div style={{background:"#f0fdfa",border:"1px solid #5eead4",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:".72rem",color:"#115e59",lineHeight:1.6}}>
            堆肥・石灰・苦土石灰など、土の状態を整える資材の記録です。肥料の資材から選ぶと在庫が減ります（費用は購入時に記録）。
          </div>
          {amendOptions.length<=1&&<div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:".72rem",color:"#856404",lineHeight:1.6}}>
            資材がまだ登録されていません。「管理」→「費用」で肥料費として購入を記録すると、ここで選べるようになります。
          </div>}
          <div style={{background:"#fff",border:"1px solid #5eead4",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <div style={{fontSize:".72rem",fontWeight:700,color:"#115e59",marginBottom:5}}>資材 1</div>
            <FG label="資材を選ぶ">
              <Sel value={fertMs.findIndex(f=>f.name===amendName)} onChange={v=>{if(v===""){setAmendName("");}else{const fm=fertMs[parseInt(v)];if(fm){setAmendName(fm.name);const mu=masterUnitOf(fm);if(mu)setAmendUnit(mu);}}}}
                options={amendOptions}/>
            </FG>
            <FG label="使用量"><div style={{display:"flex",gap:4}}><CalcInp value={amendAmt} onChange={setAmendAmt} style={{flex:1}}/><Sel value={amendUnit} onChange={setAmendUnit} options={["kg","g","袋","L","ml"].map(v=>({value:v,label:v}))}/></div></FG>
          </div>
          {amendEntries.map((ae,ai)=>(
            <div key={ai} style={{background:"#fff",border:"1px solid #5eead4",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:".72rem",fontWeight:700,color:"#115e59"}}>資材 {ai+2}</span>
                <button onClick={()=>setAmendEntries(prev=>prev.filter((_,i)=>i!==ai))}
                  style={{...S.btn,...S.btnR,...S.btnSm,fontSize:".65rem",padding:"2px 8px"}}>✕</button>
              </div>
              <FG label="資材を選ぶ">
                <Sel value={ae.name?fertMs.findIndex(f=>f.name===ae.name):""} onChange={v=>{
                  if(v===""){setAmendEntries(p=>p.map((x,i)=>i===ai?{...x,name:""}:x));}
                  else{const fm=fertMs[parseInt(v)];setAmendEntries(p=>p.map((x,i)=>i===ai?{...x,name:fm.name,unit:masterUnitOf(fm)||x.unit}:x));}
                }} options={amendOptions}/>
              </FG>
              <FG label="使用量"><div style={{display:"flex",gap:4}}><CalcInp value={ae.amt} onChange={v=>setAmendEntries(p=>p.map((x,i)=>i===ai?{...x,amt:v}:x))} style={{flex:1}}/><Sel value={ae.unit} onChange={v=>setAmendEntries(p=>p.map((x,i)=>i===ai?{...x,unit:v}:x))} options={["kg","g","袋","L","ml"].map(v=>({value:v,label:v}))}/></div></FG>
            </div>
          ))}
        </div>}
        {works.has("weed")&&<div style={panelStyle("#f0fdf4","#86efac")}>
          <div style={ctitleStyle}>🌾 除草</div>
          <div style={{fontSize:".72rem",color:"#166534",lineHeight:1.6}}>手作業・草刈り機などの除草です。方法や場所はメモに書いておけます。<b>除草剤を使った場合は「防除」で記録</b>してください（農薬使用記録簿に出力され、在庫も減ります）。</div>
        </div>}
        {works.has("hormone")&&<div style={panelStyle("#fdf4ff","#f0abfc")}>
          <div style={{...ctitleStyle,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🧪 ホルモン処理（植物成長調整剤）</span>
            <button onClick={()=>setHormEntries(prev=>[...prev,emptyHorm()])}
              style={{...S.btn,...S.btnSm,background:"#a21caf",color:"#fff",fontSize:".72rem"}}>＋ 追加</button>
          </div>
          <div style={{background:"#fdf4ff",border:"1px solid #f0abfc",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:".72rem",color:"#86198f",lineHeight:1.6}}>
            トマトトーンなど、着果促進・生育調整に使う薬剤の記録です（防除・施肥とは別に記録されます）。植物成長調整剤も農薬取締法の対象のため、農薬使用記録簿には防除と一緒に出力されます。
          </div>
          {hormOptions.length<=1&&<div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:".72rem",color:"#856404",lineHeight:1.6}}>
            ホルモン剤がまだ登録されていません。「管理」→「費用」で農薬費として購入を記録し、種類を「{HORMONE_TYPE}」にすると、ここで選べるようになります。
          </div>}
          <div style={{background:"#fffaff",border:"1px solid #f0abfc",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <div style={{fontSize:".72rem",fontWeight:700,color:"#86198f",marginBottom:5}}>ホルモン剤 1</div>
            <FG label="資材を選ぶ">
              <Sel value={pestMs.findIndex(p=>p.name===hormName)} onChange={v=>{if(v===""){setHormName("");}else{const pm=pestMs[parseInt(v)];if(pm){setHormName(pm.name);if(pm.dil)setHormDil(pm.dil);}}}}
                options={hormOptions}/>
            </FG>
            <R2>
              <FG label="希釈倍数"><CalcInp value={hormDil} onChange={setHormDil} placeholder="50"/></FG>
              <FG label="使用量（希釈後）"><div style={{display:"flex",gap:4}}><CalcInp value={hormAmt} onChange={setHormAmt} style={{flex:1}}/><Sel value={hormUnit} onChange={setHormUnit} options={["L","ml","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
            </R2>
            {(()=>{ const pc=pestConcOf(hormName,hormDil,hormAmt,hormUnit); return pc?(
              <FG label="原液量（自動計算）">
                <div style={{display:"flex",gap:4}}>
                  <div style={{...S.inp,flex:1,background:"#f0fdf4",color:"#065f46",cursor:"default",fontWeight:600}}>{pc.amt}</div>
                  <div style={{...S.inp,width:60,flex:"none",background:"#f0fdf4",color:"#065f46",cursor:"default",textAlign:"center"}}>{pc.unit}</div>
                </div>
                {hormName&&<div style={{fontSize:".68rem",color:"#059669",marginTop:2}}>💧 原液 {pc.amt}{pc.unit} → 在庫から差し引きます</div>}
              </FG>):null; })()}
            <FG label="目的・対象"><Inp value={hormTgt} onChange={setHormTgt} placeholder="着果促進（第2花房）等"/></FG>
          </div>
          {hormEntries.map((he,hi)=>(
            <div key={hi} style={{background:"#fffaff",border:"1px solid #f0abfc",borderRadius:8,padding:"8px 10px",marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:".72rem",fontWeight:700,color:"#86198f"}}>ホルモン剤 {hi+2}</span>
                <button onClick={()=>setHormEntries(prev=>prev.filter((_,i)=>i!==hi))}
                  style={{...S.btn,...S.btnR,...S.btnSm,fontSize:".65rem",padding:"2px 8px"}}>✕</button>
              </div>
              <FG label="資材を選ぶ">
                <Sel value={he.name?pestMs.findIndex(p=>p.name===he.name):""} onChange={v=>{
                  if(v===""){setHormEntries(p=>p.map((x,i)=>i===hi?{...x,name:""}:x));}
                  else{const pm=pestMs[parseInt(v)];setHormEntries(p=>p.map((x,i)=>i===hi?{...x,name:pm.name,dil:pm.dil||x.dil}:x));}
                }} options={hormOptions}/>
              </FG>
              <R2>
                <FG label="希釈倍数"><CalcInp value={he.dil} onChange={v=>setHormEntries(p=>p.map((x,i)=>i===hi?{...x,dil:v}:x))} placeholder="50"/></FG>
                <FG label="使用量（希釈後）"><div style={{display:"flex",gap:4}}><CalcInp value={he.sprayAmt} onChange={v=>setHormEntries(p=>p.map((x,i)=>i===hi?{...x,sprayAmt:v}:x))} style={{flex:1}}/><Sel value={he.sprayUnit||"L"} onChange={v=>setHormEntries(p=>p.map((x,i)=>i===hi?{...x,sprayUnit:v}:x))} options={["L","ml","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
              </R2>
              {(()=>{ const pc=pestConcOf(he.name,he.dil,he.sprayAmt,he.sprayUnit); return pc?(
                <FG label="原液量（自動計算）">
                  <div style={{display:"flex",gap:4}}>
                    <div style={{...S.inp,flex:1,background:"#f0fdf4",color:"#065f46",cursor:"default",fontWeight:600}}>{pc.amt}</div>
                    <div style={{...S.inp,width:60,flex:"none",background:"#f0fdf4",color:"#065f46",cursor:"default",textAlign:"center"}}>{pc.unit}</div>
                  </div>
                  {he.name&&<div style={{fontSize:".68rem",color:"#059669",marginTop:2}}>💧 原液 {pc.amt}{pc.unit} → 在庫から差し引きます</div>}
                </FG>):null; })()}
              <FG label="目的・対象"><Inp value={he.tgt} onChange={v=>setHormEntries(p=>p.map((x,i)=>i===hi?{...x,tgt:v}:x))} placeholder="着果促進（第2花房）等"/></FG>
            </div>
          ))}
        </div>}
        {works.has("harvest")&&<div style={panelStyle("#fff9f0","#ffd9a0")}>
          <div style={ctitleStyle}>🧺 収穫詳細</div>
          <div style={{fontSize:".72rem",color:"#888",marginBottom:8}}>品質別に入力（入力した品質のみ集計されます）</div>
          {["秀品","優品","良品","規格外"].map(q=>(
            <div key={q} style={{background:"#fffdf5",border:"1px solid #f0e0b0",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{fontSize:".72rem",fontWeight:700,color:"#5c3d1e",marginBottom:5}}>{q}</div>
              <R2>
                <FG label="kg"><CalcInp value={hvGrades[q].kg} onChange={v=>setHvGrades(g=>({...g,[q]:{...g[q],kg:v}}))} placeholder="0"/></FG>
                <FG label="個数"><CalcInp value={hvGrades[q].cnt} onChange={v=>setHvGrades(g=>({...g,[q]:{...g[q],cnt:v}}))} placeholder="0"/></FG>
              </R2>
            </div>
          ))}
          <div style={{fontSize:".72rem",color:"#888",marginTop:4}}>
            合計: {(()=>{
              const tKg=Object.values(hvGrades).reduce((s,v)=>s+(parseFloat(v.kg)||0),0);
              const tCnt=Object.values(hvGrades).reduce((s,v)=>s+(parseInt(v.cnt)||0),0);
              return (tKg>0?tKg.toFixed(1)+"kg ":"")+( tCnt>0?tCnt+"個":"");
            })()}
          </div>
        </div>}
        {works.has("discard")&&<div style={panelStyle("#fef2f2","#fca5a5")}><div style={ctitleStyle}>♻️ 廃棄・株数調整</div><R2><FG label="廃棄株数"><CalcInp value={discardCnt} onChange={setDiscardCnt} placeholder="0"/></FG><FG label="追加株数"><CalcInp value={addCnt} onChange={setAddCnt} placeholder="0"/></FG></R2></div>}
        
        {works.has("equip")&&<div style={panelStyle("#f5f0ff","#c4b5fd")}>
          <div style={{...ctitleStyle,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🏗️ 資材・設備作業</span>
            <button onClick={()=>setEquipEntries(prev=>[...prev,emptyEquip()])}
              style={{...S.btn,...S.btnSm,background:"#7c3aed",color:"#fff",fontSize:".72rem"}}>＋ 追加</button>
          </div>
          <div style={{background:"#f9f7ff",border:"1px solid #c4b5fd",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <div style={{fontSize:".72rem",fontWeight:700,color:"#5b21b6",marginBottom:5}}>資材 1</div>
            <FG label="設備・資材を選ぶ">
              <Sel value={equipSel[0]!==undefined?String(equipSel[0]):""} onChange={v=>setEquipSel(v!==""?[parseInt(v)]:[])}
                options={[{value:"",label:"（選択）"},...equips.map((e,i)=>({value:i,label:e.name+"（"+e.cat+"）"}))]}/>
            </FG>
            <FG label="作業種別"><Sel value={equipAct} onChange={setEquipAct} options={["設置","撤去","使用","着用","脱去","点検","修理","その他"].map(v=>({value:v,label:v}))}/></FG>
            {equipAct==="使用"&&<FG label="使用量（任意）"><div style={{display:"flex",gap:4}}>
              <CalcInp value={equipUseAmt} onChange={setEquipUseAmt} placeholder="例：5" style={{flex:1}}/>
              <Sel value={equipUseUnit} onChange={setEquipUseUnit} options={["L","ml","kg","g","個"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/>
            </div></FG>}
          </div>
          {equipEntries.map((ee,ei)=>(
            <div key={ei} style={{background:"#f9f7ff",border:"1px solid #c4b5fd",borderRadius:8,padding:"8px 10px",marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:".72rem",fontWeight:700,color:"#5b21b6"}}>資材 {ei+2}</span>
                <button onClick={()=>setEquipEntries(prev=>prev.filter((_,i)=>i!==ei))}
                  style={{...S.btn,...S.btnR,...S.btnSm,fontSize:".65rem",padding:"2px 8px"}}>✕</button>
              </div>
              <FG label="設備・資材を選ぶ">
                <Sel value={ee.idx!==""?String(ee.idx):""} onChange={v=>setEquipEntries(p=>p.map((x,i)=>i===ei?{...x,idx:v!==""?parseInt(v):""}:x))}
                  options={[{value:"",label:"（選択）"},...equips.map((e,i)=>({value:i,label:e.name+"（"+e.cat+"）"}))]}/>
              </FG>
              <FG label="作業種別">
                <Sel value={ee.act} onChange={v=>setEquipEntries(p=>p.map((x,i)=>i===ei?{...x,act:v}:x))}
                  options={["設置","撤去","使用","着用","脱去","点検","修理","その他"].map(v=>({value:v,label:v}))}/>
              </FG>
              {ee.act==="使用"&&<FG label="使用量（任意）"><div style={{display:"flex",gap:4}}>
                <CalcInp value={ee.useAmt||""} onChange={v=>setEquipEntries(p=>p.map((x,i)=>i===ei?{...x,useAmt:v}:x))} placeholder="例：5" style={{flex:1}}/>
                <Sel value={ee.useUnit||"L"} onChange={v=>setEquipEntries(p=>p.map((x,i)=>i===ei?{...x,useUnit:v}:x))} options={["L","ml","kg","g","個"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/>
              </div></FG>}
            </div>
          ))}
        </div>}
        <FG label="📷 生育状況の写真（最大3枚・撮影日時を自動取得）">
          {(()=>{const imgs=[[logImg,setLogImg],[logImg2,setLogImg2],[logImg3,setLogImg3]];const count=imgs.filter(([v])=>v).length;return <>
          {count<3 && (
            <div style={{border:"2px dashed "+BD,borderRadius:10,padding:14,textAlign:"center",cursor:"pointer",background:"#fafafa"}} onClick={()=>document.getElementById("logImgInp").click()}>
              <input id="logImgInp" type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleLogImg}/>
              <div style={{fontSize:"1.5rem",marginBottom:2}}>📷</div>
              <p style={{fontSize:".72rem",color:TX3}}>タップして写真を選択（まとめて{3-count}枚まで）</p>
            </div>
          )}
          {count>0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:7}}>
              {imgs.map(([v,setter],i)=>v?(
                <div key={i} style={{position:"relative",aspectRatio:"1",borderRadius:8,overflow:"hidden"}}>
                  <img src={v.base64||v} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <button onClick={()=>setter(null)} style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,.55)",border:"none",color:"#fff",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:".75rem",lineHeight:"22px",textAlign:"center"}}>✕</button>
                </div>
              ):null)}
            </div>
          )}
          </>;})()}
        </FG>
        <R2><FG label="作業日"><Inp type="date" value={date} onChange={setDate}/></FG><FG label="作業時刻"><Inp type="time" value={time} onChange={setTime}/></FG></R2>

        <FG label="作業時間（分）"><CalcInp value={dur} onChange={setDur} placeholder="30"/></FG>
        <FG label="メモ・気づき"><TA value={memo} onChange={setMemo} placeholder="天候・生育状態・気づいたことなど…"/></FG>

      </div>
    </div>
  );
}

// TIMELINE
function TimelineScreen({ fields, crops, equips, logs, setLogs, setLogsR, showToast, onEdit, onNew, onCopy, openLb, pestMs, fertMs, setFertMs, setPestMs }) {
  // 記録を削除するとき、使った資材の在庫を戻すか確認
  const returnStockFor = (ls) => {
    const use = stockUsageMap(ls, fertMs||[], pestMs||[]);
    if(!Object.keys(use).length) return;
    if(window.confirm("この記録で使った肥料・農薬の在庫を元に戻しますか？\n（入力ミスの記録を消す場合は「OK」、在庫はそのままにする場合は「キャンセル」）"))
      applyStockDelta(Object.fromEntries(Object.entries(use).map(([k,v])=>[k,-v])), {fertMs:fertMs||[],setFertMs,pestMs:pestMs||[],setPestMs,showToast});
  };
  const [q,    setQ]    = useState("");
  const [fW,   setFW]   = useState("");
  const [selCropId, setSelCropId] = useState(""); // 品目フィルタ
  const [openDd, setOpenDd] = useState(false);    // 品目ドロップダウン
  const [ddPos,  setDdPos]  = useState({top:0,left:0,above:false});
  const [visibleCards, setVisibleCards] = useState(10); // 「もっと見る」用: 表示するカード件数
  const ddBtnRef = useRef(null);
  // フィルタ変更時は表示数をリセット
  useEffect(()=>{ setVisibleCards(10); },[q, selCropId, fW]);

  // ひらがな↔カタカナ変換
  const toHira = s => s.replace(/[\u30a1-\u30f6]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  const toKata = s => s.replace(/[\u3041-\u3096]/g, c=>String.fromCharCode(c.charCodeAt(0)+0x60));
  const matchQ = (text, word) => {
    const t=text.toLowerCase(), w=word.toLowerCase();
    return toHira(t).includes(toHira(w)) || toKata(t).includes(toKata(w)) || t.includes(w);
  };

  const WORK_LABELS = {sow:'播種',germinated:'発芽確認',transplant:'定植',water:'水やり',fert:'施肥',pest:'防除',pruning:'整枝・誘引',thinning:'摘果・摘花',sideshot:'脇芽かき',repot:'植え替え',event:'生育記録',harvest:'収穫',discard:'廃棄',equip:'資材作業',check:'見回り',soil:'土づくり',amend:'土壌改良',weed:'除草',hormone:'ホルモン処理',other:'その他',end:'栽培終了'};

  // フィルタ済みログ
  const filtered = logs.filter(l=>{
    if(l.work==='schedule') return false; // カスタム予定はタイムラインに表示しない
    if(selCropId && l.cropId !== selCropId) return false;
    if(fW && l.work !== fW) return false;
    if(q){
      const cr=crops.find(c=>c.id===l.cropId)||{};
      const db=CDB[cr.type]||{};
      const d=l.date||'';
      // 日付を複数形式で検索可能に（2026-05-20, 2026/05/20, 05/20, 5/20）
      const dSlash=d.replace(/-/g,'/');
      const dShort=d.slice(5).replace('-','/').replace(/^0/,'');
      const txt=[db.n, cr.variety, cr.customName, l.memo, l.work, WORK_LABELS[l.work]||'', d, dSlash, dShort, l.fertName||'', l.pestName||''].join(' ');
      if(!matchQ(txt, q)) return false;
    }
    return true;
  }).sort((a,b)=>((b.date||'')+(b.time||''))>((a.date||'')+(a.time||''))?1:-1);

  // 日付でグループ化
  // 日付でグループ化
  // date降順→同日内はcreated_at/id順にソートしてからグループ化
  const filteredSorted = [...filtered].sort((a,b)=>{
    if((b.date||'') !== (a.date||'')) return (b.date||'') > (a.date||'') ? 1 : -1;
    return 0; // 同日内はDB取得順を維持
  });
  const grouped = [];
  filteredSorted.forEach(l=>{
    const d = l.date||'日付なし';
    const last = grouped[grouped.length-1];
    if(last && last.date===d) last.logs.push(l);
    else grouped.push({date:d, logs:[l]});
  });
  // 同じ日・同じ品目・同じ圃場のログをカードグループ化
  const groupDayLogs = (logs) => {
    const map={}, order=[];
    logs.forEach(l=>{
      const key = l._groupId || (l.cropId+':'+l.fieldIdx+':'+l.date+':'+(l.time||''));
      if(!map[key]){ map[key]={key,logs:[]}; order.push(key); }
      map[key].logs.push(l);
    });
    return order.map(k=>map[k]);
  };

  // 品目タイプでグループ化（ドロップダウン用）
  const cropGroups = {};
  crops.filter(c=>!c.ended).forEach(c=>{
    const db=CDB[c.type]||{};
    const key=c.type==='custom'?(c.customName||'その他'):(db.n||c.type);
    if(!cropGroups[key]) cropGroups[key]={key, emoji:db.e||'🌱', crops:[]};
    cropGroups[key].crops.push(c);
  });

  const selCrop = selCropId ? crops.find(c=>c.id===selCropId) : null;
  const selDb = selCrop ? CDB[selCrop.type]||{} : {};
  const selLabel = selCrop ? (selDb.e||'🌱')+' '+(selCrop.type==='custom'?selCrop.customName||'その他':selDb.n||selCrop.type)+(selCrop.variety?' ('+selCrop.variety+')':'') : '🌱 すべての品目';

  
  const scrollRef = useRef(null);

  return (
    <div ref={scrollRef} style={S.scr} className="scr-inner">
      {/* ヘッダー */}
      <div style={{...S.sec,flexWrap:'wrap',gap:6}}>
        <span>📋 作業記録</span>
        <button onClick={onNew} style={S.secBtn}>＋ 記録する</button>
      </div>

      {/* フィルター */}
      <div style={{padding:'0 0 8px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
        {/* 品目ドロップダウン */}
        <div style={{position:'relative'}}>
          <button onClick={()=>{
              const r=ddBtnRef.current?.getBoundingClientRect();
              if(r){
                const above=r.bottom>window.innerHeight*0.55;
                setDdPos({top:above?r.top-8:r.bottom+4,left:r.left,above});
              }
              setOpenDd(d=>!d);
            }}
            ref={ddBtnRef}
            style={{...S.btn,...S.btnSm,background:selCropId?G:'#f0f0eb',color:selCropId?'#fff':'#5a5040',border:'1px solid #e0d9ce',fontSize:'.72rem',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {selLabel} ▾
          </button>
          {openDd&&<div style={{position:'fixed',zIndex:9999,background:'#fff',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,.15)',minWidth:180,maxHeight:280,overflowY:'auto',top:ddPos.above?'auto':ddPos.top,bottom:ddPos.above?window.innerHeight-ddPos.top:'auto',left:ddPos.left}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:'10px 14px',cursor:'pointer',fontSize:'.82rem',borderBottom:'1px solid #f0ebe3'}}
              onClick={()=>{setSelCropId('');setOpenDd(false);}}>
              🌱 すべての品目
            </div>
            {Object.values(cropGroups).map(g=>(
              <div key={g.key}>
                {g.crops.length===1?(
                  <div style={{padding:'10px 14px',cursor:'pointer',fontSize:'.82rem',borderBottom:'1px solid #f0ebe3',background:selCropId===g.crops[0].id?'#f0f9f0':''}}
                    onClick={()=>{setSelCropId(g.crops[0].id);setOpenDd(false);}}>
                    {g.emoji} {g.key}{g.crops[0].variety?' ('+g.crops[0].variety+')':''}
                  </div>
                ):(
                  g.crops.map(c=>(
                    <div key={c.id} style={{padding:'10px 14px 10px 24px',cursor:'pointer',fontSize:'.82rem',borderBottom:'1px solid #f0ebe3',background:selCropId===c.id?'#f0f9f0':''}}
                      onClick={()=>{setSelCropId(c.id);setOpenDd(false);}}>
                      {g.emoji} {g.key}{c.variety?' ('+c.variety+')':''}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>}
        </div>

        {/* 検索 */}
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 キーワード検索..."
          style={{flex:1,minWidth:100,padding:'6px 10px',border:'1px solid #e0d9ce',borderRadius:8,fontSize:'16px',fontFamily:'inherit',outline:'none'}}/>
      </div>



      {/* 日付グループ別表示（カード10件初期表示、20件ずつ追加） */}
      {!grouped.length&&<div style={{color:TX3,fontSize:'.82rem',padding:16,textAlign:'center'}}>記録がありません</div>}
      {(()=>{
        // 全カードをフラット化してvisibleCards件に絞る
        const allCards=[];
        grouped.forEach(g=>{
          groupDayLogs(g.logs).forEach(card=>allCards.push({...card,_date:g.date}));
        });
        const shown=allCards.slice(0,visibleCards);
        // 表示分を日付でまとめ直す
        const dateOrder=[]; const byDate={};
        shown.forEach(card=>{
          if(!byDate[card._date]){byDate[card._date]={cards:[]};dateOrder.push(card._date);}
          byDate[card._date].cards.push(card);
        });
        return <>
          {dateOrder.map(date=>{
            const {cards:dcards}=byDate[date];
            return (
              <div key={date} style={{marginBottom:16}}>
                {/* 日付ヘッダー */}
                <div style={{fontSize:'.72rem',fontWeight:700,color:'#5c3d1e',padding:'4px 2px',borderBottom:'2px solid #e0d9ce',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>📅 {fmtYMD(date)}</span>
                  {(()=>{
                    const totalMin=dcards.reduce((s,card)=>s+(parseInt(card.logs[0]?.duration)||0),0);
                    if(totalMin<=0) return null;
                    const h=Math.floor(totalMin/60), m=totalMin%60;
                    const timeStr=h>0?(m>0?h+'時間'+m+'分':h+'時間'):m+'分';
                    return <span style={{fontSize:'.66rem',fontWeight:400,color:'#888'}}>⏱ 合計 {timeStr}</span>;
                  })()}
                </div>
                {/* カード */}
                {dcards.map(card=>{
                  const l0=card.logs[0];
                  const cr=crops.find(c=>c.id===l0.cropId)||{};
                  const db=CDB[cr.type]||{};
                  const fieldName=fields[l0.fieldIdx]?.name||'';
                  const photos=[];
                  card.logs.forEach(l=>{[l.imgSrc,l.imgSrc2,l.imgSrc3].forEach(s=>{if(s&&photos.length<3)photos.push(s);});});
                  const memoLog=card.logs.find(l=>l.memo);
                  const meta=skCardMeta(card.logs);
                  return (
                    <div key={card.key} style={{...S.card,padding:0,overflow:'hidden',marginBottom:8}}>
                      <div style={{padding:'9px 11px'}}>
                        {/* 品目名 */}
                        <div style={{fontSize:'.84rem',fontWeight:700,color:'#1c1a14',marginBottom:4}}>
                          {db.e||'🌱'} {getCropName(cr)}{cr.variety?' ('+cr.variety+')':''}
                        </div>
                        {/* 圃場・時刻・作業時間 */}
                        {(fieldName||meta.time||meta.duration)&&<div style={{fontSize:'.7rem',color:TX3,marginBottom:5,display:'flex',gap:8,flexWrap:'wrap'}}>
                          {fieldName&&<span>📍{fieldName}</span>}
                          {meta.time&&<span>🕐{meta.time}</span>}
                          {meta.duration&&<span>⏱{meta.duration}</span>}
                        </div>}
                        {/* 作業タグ（決まった順番） */}
                        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:5}}>
                          {skCardWorks(card.logs).map(w=>{const wi=skWorkInfo(w);return <span key={w} style={{...S.tag,background:wi.bg,color:wi.fg}}>{wi.icon} {wi.label}</span>;})}
                        </div>
                        {/* 詳細（作業の順番 → 同じ作業は名前順） */}
                        {skCardLines(card.logs).map((ln,li)=><div key={li} style={{fontSize:'.75rem',color:ln.color}}>{ln.text}</div>)}
                        {memoLog?.memo&&<div style={{fontSize:'.78rem',color:'#5a5040',marginTop:4,lineHeight:1.5}}>{memoLog.memo}</div>}
                      </div>
                      {/* 写真 */}
                      {photos.length>0&&(
                        <div style={{display:'grid',gridTemplateColumns:photos.length===1?'1fr':photos.length===2?'1fr 1fr':'1fr 1fr 1fr',gap:2}}>
                          {photos.map((src,i)=>(
                            <img key={i} src={src} alt="" style={{width:'100%',height:photos.length===1?'200px':photos.length===2?'150px':'110px',objectFit:'cover',display:'block',cursor:'pointer'}}
                              onClick={()=>openLb(photos,i)}/>
                          ))}
                        </div>
                      )}
                      {/* 操作ボタン */}
                      <div style={{display:'flex',gap:6,padding:'6px 11px',borderTop:'1px solid #f0ebe3'}}>
                        <button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>onEdit(card.logs)}>✏️ 編集</button>
                        <button style={{...S.btn,...{background:"#f59e0b",color:"#fff",padding:"4px 10px",fontSize:".7rem",borderRadius:8,width:"auto",display:"inline-block"}}} onClick={()=>onCopy&&onCopy(card.logs)}>📋 コピー</button>
                        {card.logs.length===1
                          ? <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{if(!window.confirm('削除?'))return;returnStockFor([card.logs[0]]);dbDelete('logs',card.logs[0].id);setLogsR(prev=>prev.filter(x=>x.id!==card.logs[0].id));showToast('削除しました');}}>削除</button>
                          : <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{if(!window.confirm('削除?'))return;returnStockFor(card.logs);const ids=new Set(card.logs.map(l=>l.id));ids.forEach(id=>dbDelete('logs',id));setLogsR(prev=>prev.filter(x=>!ids.has(x.id)));showToast('削除しました');}}>削除</button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {/* もっと見る */}
          {allCards.length>visibleCards&&(
            <div style={{textAlign:'center',padding:'12px 0 8px'}}>
              <button onClick={()=>setVisibleCards(v=>v+20)}
                style={{padding:'9px 22px',borderRadius:999,border:'1px solid '+G,background:'#fff',color:G,fontSize:'.8rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                もっと見る（残り{allCards.length-visibleCards}件）
              </button>
            </div>
          )}
        </>;
      })()}
      {/* 外クリックでドロップダウン閉じる */}
      {openDd&&<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9998}} onClick={()=>setOpenDd(false)}/>}
      
    </div>
  );
}

// ─── 申告（青色申告・農業所得）の計算：申告タブと帳簿Excelで共通 ───
const LEDGER_CAT_TO_KAMOKU = {
  seed:"種苗費", fert:"肥料費", pest:"農薬衛生費", equip:"諸材料費", machine:"農具費",
  land:"地代・賃借料", labor:"雇人費", fuel:"動力光熱費", water:"動力光熱費",
  transport:"荷造運賃手数料", sales:"荷造運賃手数料", research:"その他", comms:"その他",
  insurance:"農業共済掛金", deprec:"減価償却費", vehicle:"その他", other:"その他", worker:"専従者給与"
};
const LEDGER_KAMOKU_COLS = ["租税公課","種苗費","素畜費","肥料費","飼料費","農具費","農薬衛生費","諸材料費","修繕費",
  "動力光熱費","作業用衣料費","農業共済掛金","減価償却費","荷造運賃手数料","雇人費","利子割引料",
  "地代・賃借料","土地改良費","専従者給与","その他"];
// 定額法の償却率（耐用年数省令の率＝1/耐用年数を小数第3位で切り上げ）
const depRateOf = life => life>0 ? Math.ceil(1000/life)/1000 : 0;
// 耐用年数を設定した農機具等（固定資産）
const getDepEquips = (equips) => (equips||[]).filter(eq=>!MATERIAL_CATS.includes(eq.cat) && (parseInt(eq.depYears)||0)>0 && (parseFloat(eq.price)||0)>0 && eq.date);
// 固定資産の「取得」の費用記録か（修理・燃料など同じ機械に紐付いた費用は除く）
const makeIsAssetPurchase = (equips) => {
  const byId = {}; getDepEquips(equips).forEach(eq=>{ byId[eq.id]=eq; });
  return c => {
    const eq = c && c.masterId && byId[c.masterId];
    if(!eq || !(c.cat==="machine"||c.cat==="equip")) return false;
    return (c.date && String(c.date).slice(0,10)===String(eq.date).slice(0,10)) || Math.abs((Number(c.amt)||0)-(parseFloat(eq.price)||0))<1;
  };
};
// 定額法：事業に使い始めた月から月割り（1ヶ月未満切り上げ）、残存1円
const depreciationFor = (eq, year, kaigyoDate) => {
  const price=parseFloat(eq.price)||0, life=parseInt(eq.depYears)||0;
  const bought = String(eq.date||"").slice(0,10);
  if(!bought || bought > year+"-12-31") return {annual:0, book:0, owned:false};
  const start = (kaigyoDate && bought < kaigyoDate) ? kaigyoDate : bought;
  const by=parseInt(start.slice(0,4)), bm=parseInt(start.slice(5,7))||1;
  if(year<by) return {annual:0, book:price, owned:true};
  // 償却率は1/1000単位の整数で掛けてから割る（0.143等の小数を掛けると1円ずれることがあるため）
  const full = Math.floor(price*Math.ceil(1000/life)/1000);
  let acc=0, annual=0;
  for(let y=by;y<=year;y++){
    const m = y===by ? (12-bm+1) : 12;
    const a = Math.max(0, Math.min(Math.floor(full*m/12), price-1-acc));
    acc += a; if(y===year) annual=a;
  }
  return {annual, book:price-acc, owned:true};
};
// 資材（肥料・農薬・消耗資材）の在庫評価額：在庫÷内容量×購入価格（内容量か価格が未設定なら0＝在庫タブと同じ）
const stockValueOf = (m) => {
  const cap=parseFloat(m.capacity)||0, price=parseFloat(m.price)||0, stock=parseFloat(m.stock)||0;
  if(!(cap>0 && price>0 && stock>0)) return 0;
  const cu=m.cunit||m.sunit||"", su=m.sunit||m.cunit||"";
  return Math.round(price/cap*normalizeToMasterUnit(stock, su, cu));
};
const readLS = (k, fb) => { try{ const v=localStorage.getItem(k); return v==null?fb:v; }catch{ return fb; } };
const readLSJson = (k, fb) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } };

// ─── 端末をまたいで共有する設定（開業日・元入金・棚卸）：costsテーブルの設定行に保存 ───
// 設定行のID：costs.id は uuid 型のため、ユーザーIDから決まった uuid を作る（1=カード 2=電子マネー 3=アプリ設定）
const cfgRowId = (uid, n) => String(uid).slice(0,24) + "c0f1a000000" + n;
let APP_SETTINGS_UID = null;
let _appSettingsTimer = null;
const collectAppSettings = () => {
  const out = { kaigyoDate: readLS("sakumemo_kaigyo_date",""), blueDed: readLS("sakumemo_blue_ded",""), motoire: readMotoireMap(), inventory:{} };
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith("inventoryValue_")) out.inventory[k.slice(15)] = readLSJson(k,{}); } }catch{}
  return out;
};
const syncAppSettings = () => {
  if(!APP_SETTINGS_UID) return;
  clearTimeout(_appSettingsTimer);
  _appSettingsTimer = setTimeout(()=>{
    dbUpsert("costs", { id:cfgRowId(APP_SETTINGS_UID,3), user_id:APP_SETTINGS_UID, cat:"__app_cfg", name:"__app_settings",
      note:JSON.stringify(collectAppSettings()), amt:"0", date:null, field_id:null, crop_id:null, qty:null, qunit:null,
      master_id:null, work:null, pay_method:null, pay_date:null, cancelled:false });
  }, 800);
};
// クラウドの設定を端末に反映（クラウドにある値を優先し、端末にしかない値は残す）→ 統合した内容を保存
const applyAppSettings = (cloud) => {
  try{
    if(cloud && typeof cloud==="object"){
      if(cloud.kaigyoDate) localStorage.setItem("sakumemo_kaigyo_date", cloud.kaigyoDate);
      if(cloud.blueDed) localStorage.setItem("sakumemo_blue_ded", cloud.blueDed);
      if(cloud.motoire && typeof cloud.motoire==="object"){ const m={...readMotoireMap(), ...cloud.motoire}; delete m._legacy; localStorage.setItem("motoire", JSON.stringify(m)); }
      if(cloud.inventory && typeof cloud.inventory==="object") Object.entries(cloud.inventory).forEach(([y,v])=>{ if(v&&typeof v==="object") localStorage.setItem("inventoryValue_"+y, JSON.stringify(v)); });
    }
  }catch{}
  syncAppSettings();
};

function buildLedger(Y, { costs=[], equips=[], cards=[], emoney=[] }) {
  const YS = String(Y);
  const WAREKI = "令和"+(Y-2018)+"年";
  const yearEnd = YS+"-12-31";
  const KAIGYO_DATE = readLS("sakumemo_kaigyo_date","");
  const apRatesAll = readLSJson("apportionRates",{});
  const inv = readLSJson("inventoryValue_"+YS,{});
  // 期首棚卸は、入力がなければ前年の期末棚卸を引き継ぐ（0円と明示した場合は0円）
  const invPrev = readLSJson("inventoryValue_"+(Y-1),{});
  const invStartAuto = (inv.start===undefined || inv.start===null || inv.start==="");
  const invStart = invStartAuto ? Number(invPrev.end||0) : Number(inv.start||0), invEnd = Number(inv.end||0);
  // 青色申告特別控除の上限（65万＝e-Tax/電子帳簿保存、55万＝紙提出、10万＝簡易簿記）
  const blueMax = [650000,550000,100000].includes(Number(readLS("sakumemo_blue_ded","650000"))) ? Number(readLS("sakumemo_blue_ded","650000")) : 650000;

  const kamokuOf = c => LEDGER_CAT_TO_KAMOKU[c.cat]||"その他";
  const amtOf  = c => Number(c.amt)||0;
  const rateOf = c => { const r = c.apportionRate!==undefined ? c.apportionRate : apRatesAll[c.id]; return (r!==undefined&&r!==null&&Number(r)<100)?Number(r):100; };
  const agriOf = c => { const r=rateOf(c); return r<100?Math.round(amtOf(c)*r/100):amtOf(c); };
  const isEmoneyPM = pm => !!pm && (emoney||[]).some(e=>e.name===pm);
  const isCardPM = pm => !!pm && !isEmoneyPM(pm) && (pm.startsWith("カード") || (cards||[]).some(cd=>cd.name===pm));
  const creditOf = pm => isEmoneyPM(pm) ? "事業主借" : isCardPM(pm) ? "未払金" : pm==="振込" ? "普通預金" : "現金";
  const subOf    = pm => (isCardPM(pm)||isEmoneyPM(pm)) ? pm : "";
  const isCash   = c => !c.payMethod || c.payMethod==="現金";
  const isAssetPurchase = makeIsAssetPurchase(equips);

  const valid  = costs.filter(c=>!c.cancelled && !String(c.cat||"").startsWith("__"));
  const sorted = [...valid].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  const isFund = c => c.cat==="owner_loan" || c.cat==="inc_owner_draw";
  const isExp  = c => !isIncome(c.cat) && !isFund(c);
  const afterOpen = c => !KAIGYO_DATE || !c.date || c.date >= KAIGYO_DATE;
  const preOpen = KAIGYO_DATE ? sorted.filter(c=>isExp(c) && !isAssetPurchase(c) && c.date && c.date < KAIGYO_DATE) : [];
  const yrAll   = sorted.filter(c=>(c.date||"").startsWith(YS) && afterOpen(c));
  const postOpen= yrAll.filter(c=>isExp(c) && !isAssetPurchase(c));
  const yrAsset = yrAll.filter(c=>isExp(c) && isAssetPurchase(c));
  const yrInc   = yrAll.filter(c=>isIncome(c.cat) && c.cat!=="inc_owner_draw");
  const yrLoan  = yrAll.filter(c=>c.cat==="owner_loan");
  const yrDraw  = yrAll.filter(c=>c.cat==="inc_owner_draw");
  // 確認用：開業日より前の収入（集計に含まれない）／手入力の減価償却費（農機具の自動計算と二重になる恐れ）
  const preOpenInc = KAIGYO_DATE ? sorted.filter(c=>isIncome(c.cat) && c.cat!=="inc_owner_draw" && c.date && c.date<KAIGYO_DATE && c.date.startsWith(YS)) : [];
  const manualDepAmt = yrAll.filter(c=>c.cat==="deprec").reduce((s,c)=>s+agriOf(c),0);

  // 開業費（繰延資産）：5年均等・開業年は月割り（任意償却なので金額は調整可）
  const kaiTotal = preOpen.reduce((s,c)=>s+agriOf(c),0);
  const kaiY = KAIGYO_DATE ? parseInt(KAIGYO_DATE.slice(0,4)) : 0;
  const kaiM = KAIGYO_DATE ? (parseInt(KAIGYO_DATE.slice(5,7))||1) : 1;
  const kaiSchedule = [];
  if(kaiTotal>0 && kaiY){
    const perYear = kaiTotal/5; let cum=0;
    for(let y=kaiY; cum<kaiTotal && y<kaiY+7; y++){
      const m = y===kaiY ? (12-kaiM+1) : 12;
      const amt = Math.min(Math.round(perYear*m/12), kaiTotal-cum);
      cum += amt;
      kaiSchedule.push({year:y, amt, cum, rest:kaiTotal-cum, note:y===kaiY?"開業年（"+m+"ヶ月分）":""});
    }
  }
  const kaiShokyaku = (kaiSchedule.find(k=>k.year===Y)||{}).amt||0;
  const kaiCumToY = kaiSchedule.filter(k=>k.year<=Y).reduce((s,k)=>s+k.amt,0);
  const kaimiShokyaku = Math.max(0, kaiTotal - kaiCumToY);

  // 減価償却
  const depRows = getDepEquips(equips).map(eq=>({eq, ...depreciationFor(eq,Y,KAIGYO_DATE)})).filter(x=>x.owned);
  const equipDepTotal = depRows.reduce((s,x)=>s+x.annual,0);
  const equipBookValue = depRows.reduce((s,x)=>s+x.book,0);

  // 損益
  const kamokuAmt = {};
  LEDGER_KAMOKU_COLS.forEach(k=>{ kamokuAmt[k]=postOpen.filter(c=>kamokuOf(c)===k).reduce((s,c)=>s+agriOf(c),0); });
  kamokuAmt["減価償却費"] += equipDepTotal;
  const expTotal = LEDGER_KAMOKU_COLS.reduce((s,k)=>s+(kamokuAmt[k]||0),0);
  const sumInc = cats => yrInc.filter(c=>cats.includes(c.cat)).reduce((s,c)=>s+amtOf(c),0);
  const incCrop    = sumInc(["inc_crop","inc_direct","inc_process"]);
  const incMisc    = sumInc(["inc_misc"]);
  const incSubsidy = sumInc(["inc_subsidy"]);
  const incOther   = sumInc(["inc_other"]);
  const incTotal   = incCrop+incMisc+incSubsidy+incOther;
  const totalExp   = expTotal + kaiShokyaku + invStart - invEnd;
  const agriIncome = incTotal - totalExp;
  const blueDeduction = Math.min(blueMax, Math.max(0, agriIncome));

  // 貸借対照表（年末時点・推計含む）
  const upToYE = sorted.filter(c=>afterOpen(c) && c.date && c.date<=yearEnd);
  const sumA = arr => arr.reduce((s,c)=>s+amtOf(c),0);
  const cardPayable = {};
  upToYE.filter(c=>isExp(c) && isCardPM(c.payMethod) && (!c.payDate || c.payDate>yearEnd)).forEach(c=>{ cardPayable[c.payMethod]=(cardPayable[c.payMethod]||0)+amtOf(c); });
  const totalCardPayable = Object.values(cardPayable).reduce((s,v)=>s+v,0);
  const isInflow = c => (isIncome(c.cat)&&c.cat!=="inc_owner_draw"&&!c.isReceivable) || c.cat==="owner_loan";
  const isOutflow = c => isExp(c) || c.cat==="inc_owner_draw";
  const cashEst = sumA(upToYE.filter(c=>isInflow(c)&&isCash(c))) - sumA(upToYE.filter(c=>isOutflow(c)&&isCash(c)));
  const cardPaidToYE = sumA(valid.filter(c=>isExp(c) && isCardPM(c.payMethod) && c.payDate && c.payDate<=yearEnd && afterOpen(c)));
  const bankEst = sumA(upToYE.filter(c=>isInflow(c)&&c.payMethod==="振込")) - sumA(upToYE.filter(c=>isOutflow(c)&&c.payMethod==="振込")) - cardPaidToYE;
  const receivable = sumA(upToYE.filter(c=>isIncome(c.cat) && c.isReceivable));
  const emItems = yrAll.filter(c=>isExp(c) && isEmoneyPM(c.payMethod));
  const emTotal = sumA(emItems);
  const emBiz = postOpen.filter(c=>isEmoneyPM(c.payMethod)).reduce((s,c)=>s+agriOf(c),0) + sumA(yrAsset.filter(c=>isEmoneyPM(c.payMethod)));
  const householdPart = postOpen.filter(c=>creditOf(c.payMethod||"現金")!=="事業主借").reduce((s,c)=>s+(amtOf(c)-agriOf(c)),0);
  const motoire = getOpeningMotoire(Y);
  const jigyonushiKari = sumA(yrLoan) + emBiz + (kaiY===Y?kaiTotal:0);
  const jigyonushiKashi = sumA(yrDraw) + householdPart;
  const nextMotoire = motoire + agriIncome + jigyonushiKari - jigyonushiKashi;
  const totalAsset = cashEst + bankEst + receivable + invEnd + equipBookValue + kaimiShokyaku;
  const totalLiabCap = totalCardPayable + motoire + jigyonushiKari - jigyonushiKashi + agriIncome;

  return { Y, YS, WAREKI, yearEnd, KAIGYO_DATE, invStart, invEnd, invStartAuto, blueMax, preOpenInc, manualDepAmt,
    kamokuOf, amtOf, rateOf, agriOf, isEmoneyPM, isCardPM, creditOf, subOf, isCash, isAssetPurchase, isFund, isExp, afterOpen,
    valid, sorted, preOpen, yrAll, postOpen, yrAsset, yrInc, yrLoan, yrDraw,
    kaiTotal, kaiY, kaiSchedule, kaiShokyaku, kaiCumToY, kaimiShokyaku,
    depRows, equipDepTotal, equipBookValue,
    KAMOKU_COLS:LEDGER_KAMOKU_COLS, kamokuAmt, expTotal, incCrop, incMisc, incSubsidy, incOther, incTotal, totalExp, agriIncome, blueDeduction,
    cardPayable, totalCardPayable, cashEst, bankEst, receivable, emItems, emTotal, emBiz, householdPart,
    motoire, jigyonushiKari, jigyonushiKashi, nextMotoire, totalAsset, totalLiabCap };
}

// 検索欄（費用・在庫・農具で共通）
function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{position:"relative",marginBottom:8}}>
      <input type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"🔍 検索"}
        style={{width:"100%",boxSizing:"border-box",padding:"8px 30px 8px 10px",border:"1px solid #e0d9ce",borderRadius:8,fontSize:".82rem",fontFamily:"inherit",background:"#fff"}}/>
      {value&&<button onClick={()=>onChange("")} aria-label="検索をクリア"
        style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",border:"none",background:"transparent",color:"#999",fontSize:"1rem",cursor:"pointer",padding:"4px 8px"}}>✕</button>}
    </div>
  );
}

function CostScreen({ fields, crops, fertMs, setFertMs, pestMs, setPestMs, equips, setEquips, costs, setCosts, logs, showToast, cards=[], setCards, emoney=[], setEmoney, calcPayDate, user }) {
  const today = new Date();
  const curYear  = String(today.getFullYear());
  const curMonth = curYear+"-"+String(today.getMonth()+1).padStart(2,"0"); // 端末の日付（日本時間）で今月

  const [unit,    setUnit]    = useState("month"); // "year" | "month"
  const [selYear, setSelYear] = useState(curYear);
  const [selMon,  setSelMon]  = useState(curMonth);
  const [mCost,   setMCost]   = useState(null);
  const [costTab,   setCostTab]  = useState("expense");
  const [sortKey, setSortKey] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [mainTab, setMainTab] = useState("cost"); // "cost" | "stock" | "equip" | "ledger" | "cashflow" | "subsidy"
  const [srchM, setSrchM] = useState("");
  const [costQ,  setCostQ]  = useState(""); // 費用の検索
  const [stockQ, setStockQ] = useState(""); // 在庫の検索
  const [equipQ, setEquipQ] = useState(""); // 農具の検索
  const [showRecalc, setShowRecalc] = useState(false);   // 在庫の再計算
  const [recalcSel, setRecalcSel]   = useState({});      // {key:true} 反映する行
  const [recalcActual, setRecalcActual] = useState({});  // {key:"実際の残量"} 手入力（あれば計算より優先）
  const [mItem,  setMItem]  = useState(null);
  const [mBuy,   setMBuy]   = useState(null);

  // ─── 按分マスター ───
  const [apportionMasters, setApportionMastersState] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("apportionMasters")||"[]"); } catch { return []; }
  });
  const setApportionMasters = (arr) => {
    setApportionMastersState(arr);
    try { localStorage.setItem("apportionMasters", JSON.stringify(arr)); } catch {}
  };
  const [mApportion, setMApportion] = useState(null); // 按分マスター編集モーダル
  const [showPestExportModal, setShowPestExportModal] = useState(false); // 農薬記録書出力モーダル
  const [pestExportCropId, setPestExportCropId] = useState(""); // 選択品目（""=全品目）
  const [pestExportMemberNo, setPestExportMemberNo] = useState(()=>{try{return localStorage.getItem("pestMemberNo")||"";}catch{return "";}});
  const [pestExportGrowerName, setPestExportGrowerName] = useState(()=>{try{return localStorage.getItem("pestGrowerName")||"";}catch{return "";}});
  const [pestExportHarvestDate, setPestExportHarvestDate] = useState("");

  // ─── クレジットカード：propsのcards/setCardsを使用（App levelで管理・Supabase同期） ───
  const creditCards = cards;
  const setCreditCards = setCards || (()=>{});
  const [mCard, setMCard] = useState(null); // 編集中カード（null=閉じ）
  const [mEmoney, setMEmoney] = useState(null); // 編集中電子マネー（null=閉じ）
  const isEmoneyPM = (pm) => !!pm && (emoney||[]).some(e=>e.name===pm);
  // 元入金手動修正用state
  const [motoireEditOpen, setMotoireEditOpen] = useState(false);
  const [motoireInput, setMotoireInput] = useState("");

  // ─── 補助金リスト ───
  const [subsidyList, setSubsidyListState] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("subsidyList")||"[]"); } catch { return []; }
  });
  const setSubsidyList = (arr) => {
    setSubsidyListState(arr);
    try { localStorage.setItem("subsidyList", JSON.stringify(arr)); } catch {}
  };
  const [mSubsidy, setMSubsidy] = useState(null);

  // ─── 棚卸資産 ───
  const getInventory = (yr) => {
    try { return JSON.parse(localStorage.getItem("inventoryValue_"+yr)||"{}"); } catch { return {}; }
  };
  const [invTick, setInvTick] = useState(0); // 棚卸の入力を即時に画面へ反映するため
  const setInventory = (yr, obj) => {
    try { localStorage.setItem("inventoryValue_"+yr, JSON.stringify(obj)); } catch {}
    setInvTick(t=>t+1);
    syncAppSettings();
  };

  // ─── 費用（購入）と在庫の連動 ───
  // この費用で在庫に加算した量（資材の単位）。stockQty（在庫に加算した個数）が記録されている購入のみ
  const costStockAmt = (c) => {
    const q = parseFloat(c&&c.stockQty)||0; if(!(q>0)) return 0;
    const m = [...fertMs,...pestMs,...equips].find(x=>x.id===c.masterId);
    const cap = parseFloat(c.capacity)||parseFloat(m&&m.capacity)||0;
    return cap>0 ? q*cap : q;
  };
  // ─── 在庫の再計算：購入の合計 − 作業記録の使用量合計（肥料・農薬・ホルモン剤・土壌改良） ───
  // 在庫機能の追加前の記録（stockQtyなし・資材にひもづいていない購入）も、個数×内容量で数える
  const buildRecalcRows = () => {
    const rows = [];
    const mk = (kind, list) => list.forEach((m,idx)=>{
      const catV = kind;
      let bought = 0, nBuy = 0;
      costs.forEach(c=>{
        if(c.cancelled || c.cat!==catV) return;
        const linked = c.masterId ? c.masterId===m.id : (c.name===m.name);
        if(!linked) return;
        let a = costStockAmt(c);
        if(!(a>0)){
          // 在庫機能の前の購入：数量が「250 ml」のように量の単位なら、そのまま量として数える（内容量をかけない）。「1 個」「2 本」のような個数だけ 個数×内容量
          const q=parseFloat(c.qty)||0; const cap=parseFloat(c.capacity)||parseFloat(m.capacity)||0;
          if(q>0){
            if(UNIT_BASE[unitKey(c.qunit)]!=null){ const cv=convertUnitStrict(q, c.qunit, masterUnitOf(m)); a = cv!=null ? cv : q; }
            else if(cap>0) a=q*cap;
          }
        }
        if(a>0){ bought+=a; nBuy++; }
      });
      let used = 0, nUse = 0;
      logs.forEach(l=>{
        const nm = kind==="fert" ? (isFertWork(l.work)?l.fertName:null) : (isPestWork(l.work)?l.pestName:null);
        if(!nm || nm!==m.name) return;
        const u = logUsageOf(l, m); if(u>0){ used+=u; nUse++; }
      });
      const unit = masterUnitOf(m);
      const calc = roundByUnit(bought-used, unit);
      rows.push({ key:kind+":"+m.id, kind, idx, m, unit, bought:roundByUnit(bought,unit), used:roundByUnit(used,unit), nBuy, nUse, calc, cur:parseFloat(m.stock)||0 });
    });
    mk("fert", fertMs); mk("pest", pestMs);
    return rows.filter(r=>r.nBuy>0||r.nUse>0);
  };
  const openRecalc = () => {
    const rows = buildRecalcRows(); const sel = {};
    rows.forEach(r=>{ if(r.nBuy>0 && Math.abs(Math.max(0,r.calc)-r.cur)>0.0001) sel[r.key]=true; });
    setRecalcSel(sel); setRecalcActual({}); setShowRecalc(true);
  };
  const applyRecalc = () => {
    const rows = buildRecalcRows().filter(r=>recalcSel[r.key]);
    if(rows.length===0){ showToast("反映する行を選んでください"); return; }
    let nf=[...fertMs], np=[...pestMs]; const upF=[], upP=[];
    rows.forEach(r=>{
      const act = recalcActual[r.key];
      const v = (act!==undefined && act!=="" && !isNaN(parseFloat(act))) ? Math.max(0,parseFloat(act)) : Math.max(0,r.calc);
      const u = {...r.m, stock:String(roundByUnit(v,r.unit)), status: v>0&&r.m.status==="使い切り（非表示）" ? "使用中" : r.m.status};
      if(r.kind==="fert"){ nf[r.idx]=u; upF.push(u); } else { np[r.idx]=u; upP.push(u); }
    });
    upF.forEach(u=>setFertMs(nf,u)); upP.forEach(u=>setPestMs(np,u));
    setShowRecalc(false); showToast(rows.length+"件の在庫を更新しました");
  };
  // 在庫を増減（delta>0で加算）。肥料・農薬・消耗資材に対応
  const adjustMasterStock = (masterId, delta) => {
    if(!masterId || !delta) return;
    const upd = (m) => { const next=Math.max(0, Math.round(((parseFloat(m.stock)||0)+delta)*100)/100);
      return {...m, stock:String(next), status: next>0&&m.status==="使い切り（非表示）" ? "使用中" : (next<=0&&delta<0 ? "使い切り（非表示）" : m.status)}; };
    let i=fertMs.findIndex(m=>m.id===masterId); if(i>=0){ const u=upd(fertMs[i]); setFertMs(fertMs.map((x,j)=>j===i?u:x),u); return; }
    i=pestMs.findIndex(m=>m.id===masterId); if(i>=0){ const u=upd(pestMs[i]); setPestMs(pestMs.map((x,j)=>j===i?u:x),u); return; }
    i=equips.findIndex(m=>m.id===masterId); if(i>=0 && MATERIAL_CATS.includes(equips[i].cat)){ const u=upd(equips[i]); setEquips(equips.map((x,j)=>j===i?u:x),u); }
  };

  // 按分率を取得（localStorageから）
  const getApportionRates = () => {
    try { return JSON.parse(localStorage.getItem("apportionRates")||"{}"); } catch { return {}; }
  };
  // 按分後の実際の農業費用を返す関数
  const getAgriAmt = (cost) => {
    const rates = getApportionRates();
    const rate = rates[cost.id] !== undefined ? rates[cost.id] : 100;
    return Math.round((Number(cost.amt)||0) * rate / 100);
  };

  // ─── マスター（資材）ロジック ───
  const allItems = [
    ...fertMs.map((f,i)=>({...f, _type:"fert",  _idx:i, _label:"肥料",   _color:"#d1fae5", _tc:"#065f46", _icon:"🌿"})),
    ...pestMs.map((p,i)=>({...p, _type:"pest",  _idx:i, _label:"農薬",   _color:"#fef3c7", _tc:"#92400e", _icon:"🐛"})),
    ...equips.map((e,i)=>({...e, _type:"equip", _idx:i, _label:"資材・設備", _color:"#ede9fe", _tc:"#5b21b6", _icon:"🏗️"})),
  ];
  const toHiraM=s=>(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  const toKataM=s=>(s||'').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
  const matchM=(t,w)=>{const a=(t||'').toLowerCase(),b=w.toLowerCase();return toHiraM(a).includes(toHiraM(b))||toKataM(a).includes(toKataM(b))||a.includes(b);};
  const shownMaster = srchM ? allItems.filter(x=>matchM(x.name,srchM)||matchM(x._label,srchM)||matchM(x.note,srchM)) : allItems;
  const newFert  = {_type:"fert",  name:"",type:"化成肥料",npk:"",price:"",punit:"円/袋",capacity:"",cunit:"kg",stock:"0",sunit:"kg",note:"",status:"使用中"};
  const newPest  = {_type:"pest",  name:"",type:"殺虫剤",dil:"",target:"",price:"",punit:"円/本",capacity:"",cunit:"ml",stock:"0",sunit:"ml",note:"",status:"使用中"};
  const newMaterial = {_type:"material", name:"",cat:"マルチ",price:"",punit:"円/本",capacity:"1",cunit:"本",stock:"0",sunit:"本",note:"",status:"使用中"};
  const newEquip = {_type:"equip", name:"",cat:"手工具（鍬・スコップ等）",status:"使用中",price:"",date:todayStr(),note:"",depYears:"",_label:"農機具",_color:"#ede9fe",_tc:"#5b21b6",_icon:"🔧"};
  // materialMs は equips の中から MATERIAL_CATS に属するものをフィルタして使用
  const materialMs = equips.filter(e=>MATERIAL_CATS.includes(e.cat));
  // 農機具タブ用（消耗資材を除外）
  const equipsOnly = equips.filter(e=>!MATERIAL_CATS.includes(e.cat));
  const equipWords = equipQ.trim().split(/\s+/).filter(Boolean);
  const equipsShown = equipWords.length ? equipsOnly.filter(e=>{const h=[e.name,e.cat,e.status,e.note];return equipWords.every(k=>h.some(t=>matchM(String(t||""),k)));}) : equipsOnly;

  const saveItem = () => {
    if(!mItem) return;
    const isEdit = mItem._idx !== undefined;
    const item = {...mItem, id:mItem.id||uid0()};
    if(item._type==="fert"){
      const n=isEdit?fertMs.map(x=>x.id===item.id?{...item}:x):[...fertMs,item];
      setFertMs(n,item);
    } else if(item._type==="pest"){
      const n=isEdit?pestMs.map(x=>x.id===item.id?{...item}:x):[...pestMs,item];
      setPestMs(n,item);
    } else if(item._type==="material"){
      // 消耗資材はequipsテーブルを流用（catで区別）
      const saveItem2 = {...item, _type:undefined};
      const n=isEdit?equips.map(x=>x.id===item.id?saveItem2:x):[...equips,saveItem2];
      setEquips(n,saveItem2);
    } else {
      const n=isEdit?equips.map(x=>x.id===item.id?{...item}:x):[...equips,item];
      setEquips(n,item);
    }
    if(item.price && parseFloat(item.price) > 0) {
      const costCat = (item._type==="equip"||item._type==="material")?"equip":item._type;
      const costName = item.name + (item.capacity?" ("+item.capacity+(item.cunit||item.sunit||"")+"入り)":"");
      if(isEdit) {
        // 登録時に作った費用（金額＝変更前の単価）だけを更新し、購入記録は上書きしない
        const _prev = (item._type==="fert"?fertMs:item._type==="pest"?pestMs:equips).find(x=>x.id===item.id);
        const existCostIdx = _prev ? costs.findIndex(c=>c.masterId===item.id && Number(c.amt)===Number(_prev.price)) : -1;
        if(existCostIdx >= 0) {
          const updated = costs.map((c,i)=>i===existCostIdx?{...c,amt:String(item.price),name:costName}:c);
          const updCost = updated[existCostIdx];
          setCosts(updated, updCost);
        }
      } else {
        const newCost = {id:uid0(),masterId:item.id,cat:costCat,name:costName,amt:String(item.price),date:item.buyDate||item.date||todayStr(),qty:String(item.capacity||"1"),qunit:item.cunit||item.sunit||"個",fieldIdx:"",depYears:item.depYears||"",note:item.depYears?("減価償却"+item.depYears+"年"):"マスター登録時に自動追加"};
        setCosts([...costs, newCost], newCost);
      }
    }
    setMItem(null); showToast("保存しました");
  };

  const deleteItem = (item) => {
    if(!window.confirm("削除しますか？"))return;
    if(item._type==="fert"){ dbDelete("fert_masters",item.id); setFertMs(fertMs.filter((_,i)=>i!==item._idx)); }
    else if(item._type==="pest"){ dbDelete("pest_masters",item.id); setPestMs(pestMs.filter((_,i)=>i!==item._idx)); }
    else { dbDelete("equipments",item.id); setEquips(equips.filter((_,i)=>i!==item._idx)); }
    if(item.id){
      const relatedCosts = costs.filter(c=>c.masterId===item.id);
      relatedCosts.forEach(c=>{ dbDelete("costs",c.id); });
      if(relatedCosts.length>0){ setCosts(costs.filter(c=>c.masterId!==item.id)); }
    }
    showToast("削除しました");
  };

  const saveBuy = () => {
    if(!mBuy.cnt){showToast("個数を入力してください");return;}
    const cnt = parseFloat(mBuy.cnt)||0;
    const cap = parseFloat(mBuy.capacity)||0;
    const addStock = cap>0 ? cnt*cap : cnt;
    const updItem = {...mBuy._item, stock:String((parseFloat(mBuy._item.stock)||0)+addStock)};
    if(mBuy._type==="fert") setFertMs(fertMs.map((x,i)=>i===mBuy._idx?updItem:x),updItem);
    else if(mBuy._type==="pest") setPestMs(pestMs.map((x,i)=>i===mBuy._idx?updItem:x),updItem);
    else if(mBuy._type==="material") {
      // 消耗資材の在庫更新（setEquips経由・equipmentsテーブル流用）
      setEquips(equips.map((x,i)=>i===mBuy._idx?updItem:x), updItem);
    }
    const cap2 = parseFloat(mBuy.capacity)||0;
    const label = mBuy.name+(cap2>0?" "+cnt+"個("+addStock+(mBuy.sunit||mBuy.cunit||"")+")":" "+cnt+"個");
    const newCostObj2 = {id:uid0(),cat:(mBuy._type==="equip"||mBuy._type==="material")?"equip":mBuy._type,name:label,amt:String(mBuy.amt),date:mBuy.date||todayStr(),qty:String(cnt),qunit:"個",stockQty:(mBuy._type==="equip")?"":String(cnt),cunit:mBuy.sunit||mBuy.cunit||"",fieldIdx:"",note:mBuy.note||"",masterId:mBuy._item?.id||mBuy.id||null,capacity:String(mBuy.capacity||"")};
    setCosts([...costs,newCostObj2], newCostObj2);
    showToast("購入記録しました");
    setMBuy(null);
  };

  // 年リスト（費用の年 + 今年）
  const years = [...new Set([curYear, ...costs.map(c=>(c.date||"").slice(0,4)).filter(Boolean)])].sort((a,b)=>b.localeCompare(a));
  // 月リスト（選択年の月）
  const months = Array.from({length:12},(_,i)=>selYear+"-"+String(i+1).padStart(2,"0"));

  // 期間フィルタ
  const inPeriod = d => {
    if(!d) return false;
    if(unit==="year")  return d.slice(0,4)===selYear;
    if(unit==="month") return d.slice(0,7)===selMon;
    return true;
  };
  const filteredAll = costs.filter(c=>c.cat!=="__card_cfg"&&inPeriod(c.date));
  // 耐用年数を設定した農機具の購入は「減価償却」で年ごとに計上するため費用合計には入れない
  const isDepAssetCost = makeIsAssetPurchase(equips);
  const filtered = filteredAll.filter(c=>!isIncome(c.cat)&&!c.cancelled&&c.cat!=="owner_loan"&&!isDepAssetCost(c));   // 費用のみ（取消・事業主借・減価償却する農機具の購入を除外）
  const assetBuyTotal = filteredAll.filter(c=>!c.cancelled&&isDepAssetCost(c)).reduce((s,c)=>s+(Number(c.amt)||0),0);
  const filteredIncome = filteredAll.filter(c=>isIncome(c.cat)&&!c.cancelled&&c.cat!=="inc_owner_draw"); // 収入のみ（取消・事業主貸を除外）
  const shownList = costTab==="income" ? filteredIncome : filtered;

  // 集計（按分考慮）
  const total   = filtered.reduce((s,c)=>s+getAgriAmt(c),0);
  const incomeTotal = filteredIncome.reduce((s,c)=>s+(parseFloat(c.amt)||0),0);
  const revenue = logs.filter(l=>inPeriod(l.date)).reduce((s,l)=>s+(parseFloat(l.hvKg)||0)*(parseFloat(l.hvPrice)||0),0);
  const byCat   = Object.fromEntries(COST_CATS.map(c=>[c.value,0]));
  filtered.forEach(c=>{if(byCat[c.cat]!==undefined)byCat[c.cat]+=getAgriAmt(c);});
  const maxC    = Math.max(...Object.values(byCat),1);

  // ソート
  // フィルタータブに対応したviewList
  const baseList = (() => {
    const all = filteredAll;
    if(costTab==="income") return all.filter(c=>isIncome(c.cat));
    if(costTab==="expense") return all.filter(c=>!isIncome(c.cat));
    if(costTab==="card") return all.filter(c=>c.payMethod&&cards&&cards.some&&cards.some(cd=>cd.name===c.payMethod));
    if(costTab==="emoney") return all.filter(c=>isEmoneyPM(c.payMethod));
    if(costTab==="receivable") return costs.filter(c=>c.isReceivable&&!c.cancelled); // 全期間の未収金
    return all; // "all"
  })();
  // 検索（品名・メモ・カテゴリ・支払方法・品目・金額・日付。空白区切りは「すべて含む」で絞り込み）
  const costHay = c => {
    const cr = crops.find(x=>x.id===c.cropId);
    const catL = (COST_CATS.find(k=>k.value===c.cat)||{}).label||"";
    return [c.name,c.note,catL,c.payMethod,c.amt,c.date,cr?getCropName(cr):""];
  };
  const costWords = costQ.trim().split(/\s+/).filter(Boolean);
  const viewList_unsorted = costWords.length ? baseList.filter(c=>{ const hay=costHay(c); return costWords.every(w=>hay.some(t=>matchM(String(t==null?"":t),w))); }) : baseList;
  const sorted = [...viewList_unsorted].sort((a,b)=>{
    let va,vb;
    if(sortKey==="date") { va=a.date||""; vb=b.date||""; }
    else if(sortKey==="amt") { va=parseFloat(a.amt)||0; vb=parseFloat(b.amt)||0; }
    else if(sortKey==="cat") { va=a.cat||""; vb=b.cat||""; }
    else { va=a.name||""; vb=b.name||""; }
    return sortAsc?(va>vb?1:-1):(va<vb?1:-1);
  });
  const viewList = sorted;

  const empty = {id:"",cat:"equip",name:"",amt:"",date:todayStr(),qty:"1",qunit:"個",cropId:"",note:"",payMethod:"現金",payDate:""};
  const sv = () => {
    const effName = mCost.name || (mCost._newItem ? mCost._newName : "");
    if(!effName){showToast("品名を入力してください");return;}
    // 付け替え・取り違えの防止：資材のひもづけが変わるとき／品名と資材名が違うときは確認する
    if((mCost.cat==="fert"||mCost.cat==="pest")&&mCost.masterId){
      const _list = mCost.cat==="fert"?fertMs:pestMs;
      const _cur = _list.find(m=>m.id===mCost.masterId);
      const _orig = mCost.id ? costs.find(x=>x.id===mCost.id) : null;
      const _prev = _orig&&_orig.masterId ? _list.find(m=>m.id===_orig.masterId) : null;
      if(_prev && _cur && _prev.id!==_cur.id){
        if(!window.confirm("この購入記録の資材を「"+_prev.name+"」から「"+_cur.name+"」に付け替えて保存します。\n在庫も「"+_prev.name+"」から戻して「"+_cur.name+"」に加算します。\n\nよろしいですか？")) return;
      } else if(_cur && !mCost._editMaster && String(effName).trim()!==String(_cur.name).trim()){
        if(!window.confirm("品名「"+effName+"」と、選択中の資材「"+_cur.name+"」が違います。\n在庫は「"+_cur.name+"」に加算されます。\n\nこのまま保存しますか？")) return;
      }
    }
    // 割引・ポイント分を差し引いた実質金額をamtとして保存
    const discount = parseFloat(mCost.discount)||0;
    const baseAmt = parseFloat(mCost.amt)||0;
    const realAmt = discount > 0 ? Math.max(0, baseAmt - discount) : baseAmt;
    const noteWithDiscount = discount > 0
      ? (mCost.note ? mCost.note + "　割引/ポイント-"+discount+"円" : "割引/ポイント-"+discount+"円")
      : mCost.note;
    // 按分率をnoteに付記（按分あり場合）
    const apportionRate = mCost.apportionRate !== undefined ? Number(mCost.apportionRate) : (mCost.id && getApportionRates()[mCost.id]!==undefined ? Number(getApportionRates()[mCost.id]) : 100);
    const noteBase = String(noteWithDiscount||"").replace(/\s*\[按分\d+%\]/g,"").trim();
    const noteWithApportion = (apportionRate < 100 && !isIncome(mCost.cat))
      ? (noteBase ? noteBase + "　[按分"+apportionRate+"%]" : "[按分"+apportionRate+"%]")
      : noteBase;
    const costId = mCost.id||uid0();
    // _newItemの場合は事前にmasterIdを生成して費用レコードと資材マスターを紐付ける
    const newMasterId = (mCost._newItem && mCost._newName) ? uid0() : null;
    // 新方式購入記録: _buyQtyをqtyに反映し、masterId/capacityも保存
    const buyQtyVal = mCost._buyQty ? String(mCost._buyQty) : (mCost.qty||"1");
    // 資材情報編集時はcapacity/cunitも更新後の値を使う
    const editedCapForItem = mCost._editMaster && mCost._editCapacity!==undefined ? mCost._editCapacity : null;
    const editedCunitForItem = mCost._editMaster && mCost._editCunit!==undefined ? mCost._editCunit : null;
    const masterRec = mCost.masterId&&(mCost.cat==="fert"||mCost.cat==="pest")
      ? (mCost.cat==="fert"?fertMs:pestMs).find(m=>m.id===mCost.masterId) : null;
    const buyCapVal = editedCapForItem !== null ? String(editedCapForItem)
      : masterRec ? String(masterRec.capacity||"")
      : (mCost.capacity||"");
    const buyCunitVal = editedCunitForItem !== null ? String(editedCunitForItem)
      : masterRec ? String(masterRec.cunit||"")
      : (mCost.cunit||"");
    // _editNameがあれば費用レコードの品名も更新
    const finalName = (mCost._editMaster && mCost._editName!==undefined) ? mCost._editName : effName;
    const finalMasterId = newMasterId || mCost.masterId || null;
    const _stockTracked = (mCost.cat==="fert"||mCost.cat==="pest") && (mCost.masterId || (mCost._newItem && mCost._newName));
    const item={...mCost, id:costId, name:finalName, amt:String(realAmt), note:noteWithApportion,
      stockQty: _stockTracked ? (parseFloat(mCost._buyQty)>0 ? String(parseFloat(mCost._buyQty)) : "") : (mCost.stockQty||""),
      masterId:finalMasterId,
      qty:buyQtyVal, qunit:mCost.qunit||"個", capacity:buyCapVal, cunit:buyCunitVal,
      discount:undefined, apportionId:undefined, apportionRate:(apportionRate<100&&!isIncome(mCost.cat))?apportionRate:undefined,
      _buyQty:undefined, _buyUnitPrice:undefined, _buyOpen:undefined, _histSrch:undefined,
      _newItem:undefined, _newName:undefined, _newType:undefined, _newCapacity:undefined,
      _newCunit:undefined, _newPrice:undefined, _newTarget:undefined, _newNpk:undefined,
      _newItemType:undefined, depYears:undefined,
      _editMaster:undefined, _editName:undefined, _editType:undefined, _editCapacity:undefined,
      _editCunit:undefined, _editPrice:undefined, _editTarget:undefined, _editNpk:undefined, _showRelink:undefined};
    const n=mCost.id&&costs.find(x=>x.id===mCost.id)?costs.map(x=>x.id===mCost.id?item:x):[...costs,item];
    // 按分率をlocalStorageに保存
    if(!isIncome(mCost.cat)){
      try {
        const rates = getApportionRates();
        if(apportionRate < 100) rates[costId] = apportionRate;
        else delete rates[costId];
        localStorage.setItem("apportionRates", JSON.stringify(rates));
      } catch {}
    }
    setCosts(n,item);
    // 肥料費・農薬費：品名が未登録なら資材マスターを自動生成
    if((mCost.cat==="fert"||mCost.cat==="pest")&&mCost.name&&!mCost.id&&!mCost._newItem&&!mCost.masterId){
      const name = mCost.name;
      if(mCost.cat==="fert"&&!fertMs.find(m=>m.name===name)){
        const newM={id:uid0(),_type:"fert",name,type:"化成肥料",npk:"",price:"",punit:"円/袋",capacity:"",cunit:"kg",stock:"0",sunit:"kg",note:"",status:"使用中"};
        setFertMs([...fertMs,newM],newM);
        showToast("資材マスターに「"+name+"」を自動登録しました");
      }
      if(mCost.cat==="pest"&&!pestMs.find(m=>m.name===name)){
        const newM={id:uid0(),_type:"pest",name,type:"殺虫剤",dil:"",target:"",price:"",punit:"円/本",capacity:"",cunit:"ml",stock:"0",sunit:"ml",note:"",status:"使用中"};
        setPestMs([...pestMs,newM],newM);
        showToast("資材マスターに「"+name+"」を自動登録しました");
      }
    }
    // 肥料費・農薬費で旧方式（masterLink）の在庫更新（後方互換）
    if((mCost.cat==="fert"||mCost.cat==="pest")&&mCost.masterLink&&mCost.qty&&!mCost.id&&!mCost.masterId){
      const qty = parseFloat(mCost.qty)||0;
      if(mCost.cat==="fert"){
        const idx=fertMs.findIndex(m=>m.name===mCost.masterLink);
        if(idx>=0){
          const m=fertMs[idx];
          const cap=parseFloat(m.capacity)||1;
          const addStock=qty*cap;
          const updated={...m,stock:String((parseFloat(m.stock)||0)+addStock)};
          setFertMs(fertMs.map((x,i)=>i===idx?updated:x),updated);
        }
      } else {
        const idx=pestMs.findIndex(m=>m.name===mCost.masterLink);
        if(idx>=0){
          const m=pestMs[idx];
          const cap=parseFloat(m.capacity)||1;
          const addStock=qty*cap;
          const updated={...m,stock:String((parseFloat(m.stock)||0)+addStock)};
          setPestMs(pestMs.map((x,i)=>i===idx?updated:x),updated);
        }
      }
    }
    // 肥料費・農薬費：資材（masterId）の在庫に購入個数×内容量を反映。編集時は前回加算した分との差だけ反映
    if((mCost.cat==="fert"||mCost.cat==="pest")&&mCost.masterId){
      const isF = mCost.cat==="fert";
      const work = [...(isF?fertMs:pestMs)];
      const setList = isF?setFertMs:setPestMs;
      const orig = mCost.id ? costs.find(x=>x.id===mCost.id) : null;
      const changed = new Set();
      // 別の資材に付け替えた場合は、元の資材から前回分を戻す
      if(orig && orig.masterId && orig.masterId!==mCost.masterId && !orig.cancelled){
        const back = costStockAmt(orig);
        const oi = work.findIndex(m=>m.id===orig.masterId);
        if(back>0 && oi>=0){ work[oi]={...work[oi], stock:String(Math.max(0,Math.round(((parseFloat(work[oi].stock)||0)-back)*100)/100))}; changed.add(oi); }
      }
      const idx=work.findIndex(m=>m.id===mCost.masterId);
      if(idx>=0){
        const m=work[idx];
        const oldUnit = m.sunit||m.cunit||(isF?"kg":"ml");
        const editedCap = mCost._editMaster&&mCost._editCapacity!==undefined ? mCost._editCapacity : m.capacity;
        const editedCunit = mCost._editMaster&&mCost._editCunit!==undefined ? (mCost._editCunit||oldUnit) : oldUnit;
        const cap=parseFloat(editedCap)||0;
        let stock = parseFloat(m.stock)||0;
        if(editedCunit!==oldUnit) stock = normalizeToMasterUnit(stock, oldUnit, editedCunit); // 単位変更：既存在庫を換算
        const origAmt = (orig && orig.masterId===m.id && !orig.cancelled) ? normalizeToMasterUnit(costStockAmt(orig), oldUnit, editedCunit) : 0;
        const buyQty = parseFloat(mCost._buyQty)||0;
        const newAmt = buyQty>0 ? (cap>0?buyQty*cap:buyQty) : 0;
        const delta = newAmt - origAmt;
        const newStock = Math.max(0, Math.round((stock+delta)*100)/100);
        const updated={
          ...m,
          ...(mCost._editMaster?{
            name:mCost._editName!==undefined?mCost._editName:m.name,
            type:mCost._editType!==undefined?mCost._editType:m.type,
            ...(isF?{npk:mCost._editNpk!==undefined?mCost._editNpk:m.npk}:{target:mCost._editTarget!==undefined?mCost._editTarget:m.target}),
            capacity:editedCap, cunit:editedCunit, sunit:editedCunit,
          }:{}),
          stock:String(newStock),
          status: newStock>0&&m.status==="使い切り（非表示）" ? "使用中" : m.status,
          price: (mCost._editMaster&&mCost._editPrice!==undefined) ? mCost._editPrice : (mCost._buyUnitPrice||m.price),
        };
        work[idx]=updated; changed.add(idx);
        if(Math.abs(delta)>0.001) showToast("在庫を"+(delta>0?"+":"")+Math.round(delta*100)/100+editedCunit+"反映しました（在庫 "+newStock+editedCunit+"）");
        if(mCost._editMaster) showToast("資材「"+(updated.name)+"」の情報を更新しました");
      }
      changed.forEach(i=>setList(work, work[i]));
    }
    // 農具・農機具費：masterIdがあればdepYearsを農機具マスターに反映、_editMasterなら情報も更新
    if((mCost.cat==="equip"||mCost.cat==="machine")&&mCost.masterId){
      const eqIdx = equips.findIndex(e=>e.id===mCost.masterId);
      if(eqIdx>=0){
        const eq=equips[eqIdx];
        const depVal = mCost.depYears!==undefined ? mCost.depYears : eq.depYears||"";
        const updEq = mCost._editMaster ? {
          ...eq,
          name:mCost._editName!==undefined?mCost._editName:eq.name,
          cat:mCost._editType!==undefined?mCost._editType:eq.cat,
          depYears:depVal,
        } : {...eq, depYears:depVal};
        setEquips(equips.map((x,i)=>i===eqIdx?updEq:x), updEq);
        if(mCost._editMaster) showToast("農機具「"+updEq.name+"」の情報を更新しました");
      }
    }
    // 新規資材登録（_newItem）：マスター登録 → 在庫加算
    if(mCost._newItem && mCost._newName){
      const newId = newMasterId; // 費用レコードのmasterIdと同じIDを使う
      const buyQty2 = parseFloat(mCost._buyQty)||0;
      const cap2 = parseFloat(mCost._newCapacity)||0;
      const addStock2 = cap2>0 ? buyQty2*cap2 : buyQty2;
      if(mCost.cat==="fert"){
        const newM = {
          id:newId, name:mCost._newName, type:mCost._newType||"化成肥料",
          npk:mCost._newNpk||"", price:mCost._newPrice||"", punit:"円/個",
          capacity:mCost._newCapacity||"", cunit:mCost._newCunit||"kg",
          stock:String(Math.round(addStock2*100)/100),
          sunit:mCost._newCunit||"kg", note:"", status:"使用中"
        };
        setFertMs([...fertMs, newM], newM);
        showToast("「"+mCost._newName+"」を資材マスターに登録し、在庫に"+Math.round(addStock2*100)/100+(mCost._newCunit||"kg")+"を加算しました");
      } else if(mCost.cat==="pest"){
        const newM = {
          id:newId, name:mCost._newName, type:mCost._newType||"殺虫剤",
          target:mCost._newTarget||"", capacity:mCost._newCapacity||"",
          cunit:mCost._newCunit||"ml", sunit:mCost._newCunit||"ml",
          stock:String(Math.round(addStock2*100)/100),
          price:mCost._newPrice||"", note:"", status:"使用中"
        };
        setPestMs([...pestMs, newM], newM);
        showToast("「"+mCost._newName+"」を資材マスターに登録し、在庫に"+Math.round(addStock2*100)/100+(mCost._newCunit||"ml")+"を加算しました");
      } else if(mCost.cat==="equip"||mCost.cat==="machine"){
        const newEq = {
          id:newId, name:mCost._newName,
          cat:mCost._newType||EQUIP_CATS[0],
          status:"使用中", price:String(realAmt),
          date:mCost.date||"", note:mCost.note||"",
          depYears:mCost.depYears||""
        };
        setEquips([...equips, newEq], newEq);
        showToast("「"+mCost._newName+"」を農機具管理に登録しました");
      }
    }
    setMCost(null); showToast("保存しました");
  };

  // 帳簿Excelエクスポート（複式簿記・65万円控除対応）
  const exportLedger = () => {
    const KAIGYO_DATE = (()=>{try{return localStorage.getItem("sakumemo_kaigyo_date")||"";}catch{return "";}})();
    const now = new Date();
    const defYear = now.getMonth() < 3 ? now.getFullYear()-1 : now.getFullYear(); // 1〜3月は前年分（申告時期）
    const ans = window.prompt(
      "何年分の帳簿を書き出しますか？（西暦4桁）\n開業日："+(KAIGYO_DATE||"未設定（設定画面で設定できます）"),
      String(defYear));
    if(ans===null) return;
    const Y = parseInt(String(ans).replace(/[０-９]/g,d=>String.fromCharCode(d.charCodeAt(0)-0xFEE0)),10);
    if(!(Y>=2000&&Y<=2100)){ showToast("西暦4桁で入力してください（例：2026）"); return; }
    const Lg = buildLedger(Y, {costs, equips, cards, emoney});
    const { YS, WAREKI, yearEnd, invStart, invEnd, kamokuOf, amtOf, rateOf, agriOf, isCardPM, creditOf, subOf, isCash, isAssetPurchase, isExp,
      valid, preOpen, yrAll, postOpen, yrAsset, yrInc, yrLoan, yrDraw, kaiTotal, kaiY, kaiSchedule, kaiShokyaku, depRows, equipDepTotal, KAMOKU_COLS } = Lg;
    const TAX_OF_KAMOKU = {"雇人費":"対象外","専従者給与":"対象外","租税公課":"対象外","減価償却費":"対象外",
      "農業共済掛金":"非課税","地代・賃借料":"非課税","利子割引料":"非課税"};
    const taxOf = k => TAX_OF_KAMOKU[k]||"課仕10%";
    const incTaxOf = cat => (cat==="inc_crop"||cat==="inc_direct"||cat==="inc_process") ? "課売8%(軽)" : cat==="inc_subsidy" ? "対象外" : "課売10%";
    const d2 = dt => (dt||"").replace(/-/g,"/");

    const doExport = (XLSX) => {
      const wb = XLSX.utils.book_new();

      // ── シート1: 仕訳帳 ──
      const jiHdr = ["日付","借方 勘定科目","借方 補助科目","借方 税区分","借方金額（円）",
                     "貸方 勘定科目","貸方 補助科目","貸方 税区分","貸方金額（円）","摘要"];
      const entries = []; // [sortKey, row]
      const J = (date, dr, drSub, drTax, amt, cr, crSub, crTax, memo) => entries.push([date||"", [d2(date), dr, drSub, drTax, amt, cr, crSub, crTax, amt, memo]]);
      const memoOf = c => { const cr=crops.find(x=>x.id===c.cropId); const cn=cr?getCropName(cr):""; return c.name+(cn?" ("+cn+")":"")+(c.note?" "+c.note:""); };
      // 開業資金（金額は手入力）
      if(KAIGYO_DATE && KAIGYO_DATE.startsWith(YS)) entries.push([KAIGYO_DATE, [d2(KAIGYO_DATE),"普通預金","","対象外","","元入金","","対象外","","開業資金（金額を記入）"]]);
      // 開業費（開業年のみ）
      if(kaiY===Y) preOpen.forEach(c=>J(c.date,"開業費","","課仕10%",agriOf(c),"事業主借","","対象外","開業費："+memoOf(c)));
      // 収入
      yrInc.forEach(c=>{
        const label = (INCOME_CATS.find(x=>x.value===c.cat)?.label||"農業収入").replace(/^\S+\s/,"");
        const dr = c.isReceivable ? "売掛金" : (c.payMethod==="振込" ? "普通預金" : "現金");
        J(c.date, dr, "", "対象外", amtOf(c), label, "", incTaxOf(c.cat), memoOf(c));
      });
      // 経費（家事按分は農業分のみ経費、家事分は事業主貸）
      postOpen.forEach(c=>{
        const k=kamokuOf(c), pm=c.payMethod||"現金", cr=creditOf(pm), sub=subOf(pm);
        const agri=agriOf(c), total=amtOf(c);
        const pre = isCardPM(pm)?"カード購入：":isEmoneyPM(pm)?"電子マネー("+pm+")：":"";
        J(c.date, k, "", taxOf(k), agri, cr, sub, "対象外", pre+memoOf(c)+(rateOf(c)<100?"（按分"+rateOf(c)+"%）":""));
        if(total>agri && cr!=="事業主借") J(c.date, "事業主貸", "", "対象外", total-agri, cr, sub, "対象外", "家事分："+memoOf(c));
      });
      // 固定資産の取得
      yrAsset.forEach(c=>{
        const pm=c.payMethod||"現金";
        J(c.date, "農機具等（固定資産）", c.name, "課仕10%", amtOf(c), creditOf(pm), subOf(pm), "対象外", "固定資産取得："+memoOf(c));
      });
      // 事業主借（個人資金の入金）・事業主貸（生活費等の引出し）
      yrLoan.forEach(c=>J(c.date, c.payMethod==="振込"?"普通預金":"現金", "", "対象外", amtOf(c), "事業主借", "", "対象外", memoOf(c)));
      yrDraw.forEach(c=>J(c.date, "事業主貸", "", "対象外", amtOf(c), c.payMethod==="振込"?"普通預金":"現金", "", "対象外", memoOf(c)));
      // カード引き落とし（当年に引き落とされた分・前年購入分も含む）
      const cardPaid = {};
      valid.filter(c=>isExp(c) && isCardPM(c.payMethod) && c.payDate && c.payDate.startsWith(YS) && Lg.afterOpen(c)).forEach(c=>{
        const k=c.payDate+"_"+c.payMethod;
        if(!cardPaid[k]) cardPaid[k]={date:c.payDate, card:c.payMethod, total:0};
        cardPaid[k].total += amtOf(c);
      });
      Object.values(cardPaid).forEach(g=>J(g.date, "未払金", g.card, "対象外", g.total, "普通預金", "", "対象外", "カード引落："+g.card));
      // 決算整理（12/31）
      depRows.filter(x=>x.annual>0).forEach(x=>J(yearEnd, "減価償却費", "", "対象外", x.annual, "農機具等（固定資産）", x.eq.name, "対象外", "減価償却（定額法）："+x.eq.name));
      if(kaiShokyaku>0) J(yearEnd, "開業費償却", "", "対象外", kaiShokyaku, "開業費", "", "対象外", "開業費償却（任意償却・5年均等）");
      entries.sort((a,b)=>a[0].localeCompare(b[0]));
      const jiRows = [
        ["仕　訳　帳（主要簿）　"+WAREKI+"分　農業所得"],
        ["カード払い：購入日→借方:経費/貸方:未払金　引き落とし日→借方:未払金/貸方:普通預金　／　電子マネー払い：借方:経費/貸方:事業主借　／　家事按分：家事分は事業主貸"],
        jiHdr,
        ...entries.map(e=>e[1]),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(jiRows);
      ws1["!cols"]=[{wch:10},{wch:16},{wch:12},{wch:10},{wch:11},{wch:16},{wch:12},{wch:10},{wch:11},{wch:28}];
      XLSX.utils.book_append_sheet(wb, ws1, "仕訳帳");

      // ── シート2: 経費帳 ──
      const keihiHdr = ["月日","支払先","摘要",...KAMOKU_COLS,"合計"];
      const keihiRows = [
        ["経　費　帳（農業所得者用）　"+WAREKI+"分"],
        ["国税庁農業所得者用様式準拠（家事按分は農業分のみ計上）"],
        keihiHdr,
      ];
      const byMonth = {};
      postOpen.forEach(c=>{ const m=(c.date||"").slice(0,7)||"日付なし"; (byMonth[m]=byMonth[m]||[]).push(c); });
      const pushKeihi = (date, payee, memo, kamoku, amt) => {
        const row=Array(keihiHdr.length).fill("");
        row[0]=date; row[1]=payee; row[2]=memo;
        const ki=KAMOKU_COLS.indexOf(kamoku); if(ki>=0) row[3+ki]=amt;
        row[row.length-1]=amt; keihiRows.push(row);
      };
      Object.keys(byMonth).sort().forEach(m=>{
        byMonth[m].forEach(c=>pushKeihi(c.date?c.date.slice(5).replace("-","/"):"", c.note||"", c.name+(rateOf(c)<100?"（按分"+rateOf(c)+"%）":""), kamokuOf(c), agriOf(c)));
        const tot=Array(keihiHdr.length).fill("");
        tot[2]="【"+(parseInt(m.slice(5))||"")+"月計】";
        KAMOKU_COLS.forEach((k,i)=>{ const v=byMonth[m].filter(c=>kamokuOf(c)===k).reduce((s,c)=>s+agriOf(c),0); tot[3+i]=v||""; });
        tot[tot.length-1]=byMonth[m].reduce((s,c)=>s+agriOf(c),0);
        keihiRows.push(tot);
      });
      if(equipDepTotal>0) pushKeihi("12/31","","【決算整理】減価償却費（農機具等）","減価償却費",equipDepTotal);
      if(kaiShokyaku>0) pushKeihi("12/31","","【決算整理】開業費償却","減価償却費",kaiShokyaku);
      const ws2 = XLSX.utils.aoa_to_sheet(keihiRows);
      ws2["!cols"]=[{wch:8},{wch:14},{wch:22},...KAMOKU_COLS.map(()=>({wch:7})),{wch:10}];
      XLSX.utils.book_append_sheet(wb, ws2, "経費帳");

      // ── シート3・4: 現金出納帳 / 預金出納帳（残高は数式で自動計算） ──
      const makeBook = (title, lines) => {
        const rows=[[title],["月日","摘要","入金（円）","出金（円）","残高（円）"],["","前年より繰越（実際の残高に修正してください）","","",0]];
        lines.sort((a,b)=>a[0].localeCompare(b[0])).forEach(([dt,memo,inAmt,outAmt])=>{
          const r=rows.length+1;
          rows.push([dt?dt.slice(5).replace("-","/"):"", memo, inAmt||"", outAmt||"", {f:`E${r-1}+N(C${r})-N(D${r})`}]);
        });
        return rows;
      };
      const cashLines=[], bankLines=[];
      const isCash = c => !c.payMethod || c.payMethod==="現金";
      yrAll.forEach(c=>{
        const pm=c.payMethod||"現金";
        if(isIncome(c.cat) && c.cat!=="inc_owner_draw"){ if(c.isReceivable) return; (pm==="振込"?bankLines:cashLines).push([c.date||"",memoOf(c),amtOf(c),0]); return; }
        if(c.cat==="owner_loan"){ (pm==="振込"?bankLines:cashLines).push([c.date||"","事業主借："+memoOf(c),amtOf(c),0]); return; }
        if(c.cat==="inc_owner_draw"){ (pm==="振込"?bankLines:cashLines).push([c.date||"","事業主貸："+memoOf(c),0,amtOf(c)]); return; }
        if(isCash(c)) cashLines.push([c.date||"",memoOf(c),0,amtOf(c)]);
        else if(pm==="振込") bankLines.push([c.date||"",memoOf(c),0,amtOf(c)]);
      });
      Object.values(cardPaid).forEach(g=>bankLines.push([g.date,(g.card||"カード")+" 引き落とし",0,g.total]));
      const ws3=XLSX.utils.aoa_to_sheet(makeBook("現　金　出　納　帳　"+WAREKI+"分",cashLines));
      ws3["!cols"]=[{wch:8},{wch:34},{wch:12},{wch:12},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws3, "現金出納帳");
      const ws4=XLSX.utils.aoa_to_sheet(makeBook("預　金　出　納　帳　"+WAREKI+"分",bankLines));
      ws4["!cols"]=[{wch:8},{wch:34},{wch:12},{wch:12},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws4, "預金出納帳");

      // ── シート5: カード未払金管理 ──
      const cardRows=[
        ["クレジットカード 未払金管理　"+WAREKI+"分"],
        ["購入日","カード名","摘要（購入内容）","発生額（円）","引き落とし予定日","年末時点"],
      ];
      yrAll.filter(c=>isExp(c) && isCardPM(c.payMethod)).forEach(c=>{
        const unpaid = !c.payDate || c.payDate > yearEnd;
        cardRows.push([c.date||"",c.payMethod||"",memoOf(c),amtOf(c),c.payDate||"",unpaid?"未払（翌年引落）":"支払済"]);
      });
      const ws5=XLSX.utils.aoa_to_sheet(cardRows);
      ws5["!cols"]=[{wch:10},{wch:14},{wch:28},{wch:12},{wch:14},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws5, "カード未払金管理");

      // ── シート5-2: 電子マネー支払明細 ──
      const { emItems, emTotal } = Lg;
      const emRows=[
        ["電子マネー・QR決済 支払明細　"+WAREKI+"分"],
        ["私用と共用のチャージ残高から事業経費を支払った分。仕訳は 借方:経費 / 貸方:事業主借（チャージ・残高の管理は不要）"],
        ["支払日","電子マネー","摘要（購入内容）","勘定科目","金額（円）"],
        ...emItems.map(c=>[c.date||"",c.payMethod,memoOf(c),isAssetPurchase(c)?"農機具等（固定資産）":kamokuOf(c),amtOf(c)]),
        ["","","合計","",emTotal],
      ];
      const emByName={};
      emItems.forEach(c=>{emByName[c.payMethod]=(emByName[c.payMethod]||0)+amtOf(c);});
      if(Object.keys(emByName).length>0){
        emRows.push([]); emRows.push(["【電子マネー別合計】"]);
        Object.entries(emByName).forEach(([n,a])=>emRows.push(["",n,"","",a]));
      }
      const ws5b=XLSX.utils.aoa_to_sheet(emRows);
      ws5b["!cols"]=[{wch:10},{wch:14},{wch:28},{wch:16},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws5b, "電子マネー明細");

      // ── シート6: 開業費台帳 ──
      if(kaiTotal>0){
        const kaiRows=[
          ["開　業　費　台　帳（"+KAIGYO_DATE+" 開業・それ以前の支出）"],
          ["仕訳：開業時→借方:開業費/貸方:事業主借　各年→借方:開業費償却/貸方:開業費（任意償却のため金額は調整可）"],
          ["支出年月日","費用の内容","金額（円）","勘定科目（参考）","備考"],
          ...preOpen.map(c=>[c.date||"",memoOf(c),agriOf(c),kamokuOf(c),rateOf(c)<100?"按分"+rateOf(c)+"%":""]),
          ["","開業費 合計",kaiTotal,"",""],
          [],
          ["【償却スケジュール（5年均等・開業年は月割り）】"],
          ["年度","当年償却額","償却累計","未償却残高","備考"],
          ...kaiSchedule.map(k=>["令和"+(k.year-2018)+"年"+(k.year===Y?"（今回）":""),k.amt,k.cum,k.rest,k.note]),
        ];
        const ws6=XLSX.utils.aoa_to_sheet(kaiRows);
        ws6["!cols"]=[{wch:14},{wch:35},{wch:12},{wch:16},{wch:20}];
        XLSX.utils.book_append_sheet(wb, ws6, "開業費台帳");
      }

      // ── シート7: 科目別集計 ──
      const { kamokuAmt } = Lg;
      const sumRows=[["科目別集計（"+WAREKI+"分）"],["勘定科目","金額（円）","件数","うちカード払い","うち電子マネー"]];
      KAMOKU_COLS.forEach(k=>{
        const items=postOpen.filter(c=>kamokuOf(c)===k);
        if(items.length>0 || (k==="減価償却費"&&equipDepTotal>0)){
          const cardAmt=items.filter(c=>isCardPM(c.payMethod)).reduce((s,c)=>s+agriOf(c),0);
          const emAmt=items.filter(c=>isEmoneyPM(c.payMethod)).reduce((s,c)=>s+agriOf(c),0);
          sumRows.push([k+(k==="減価償却費"&&equipDepTotal>0?"（農機具等を含む）":""),kamokuAmt[k],items.length,cardAmt,emAmt]);
        }
      });
      const { expTotal } = Lg;
      sumRows.push(["経費合計",expTotal,postOpen.length,"",""]);
      if(kaiShokyaku>0) sumRows.push(["開業費償却（当年分）",kaiShokyaku,"","",""]);
      const ws7=XLSX.utils.aoa_to_sheet(sumRows);
      ws7["!cols"]=[{wch:24},{wch:14},{wch:8},{wch:16},{wch:16}];
      XLSX.utils.book_append_sheet(wb, ws7, "科目別集計");

      // ── シート8: 損益計算書 ──
      const { incCrop, incMisc, incSubsidy, incOther, agriIncome } = Lg;

      const plRows = [
        ["損　益　計　算　書　"+WAREKI+"分　農業所得"],
        ["農業所得 = 農業収入 - 農業経費（減価償却費・開業費償却を含む）"],
        [],
        ["【農業収入の部】","","（円）"],
        ["　農産物売上高（直売・加工品を含む）","",incCrop],
        ["　農業雑収入","",incMisc],
        ["　補助金・交付金","",incSubsidy],
        ["　その他収入","",incOther],
        ["　農業収入合計","",{f:"C5+C6+C7+C8"}],
        [],
        ["【農業費用の部】","","（円）"],
      ];
      const expStartRow = plRows.length + 1;
      KAMOKU_COLS.forEach(k=>{ plRows.push(["　"+k,"",kamokuAmt[k]||0]); });
      plRows.push(["　開業費償却（決算書では減価償却費に含めて記入）","",kaiShokyaku]);
      if(invStart||invEnd){
        plRows.push(["　期首棚卸高（肥料・農薬等の在庫）","",invStart]);
        plRows.push(["　期末棚卸高（差し引き）","",-invEnd]);
      }
      const plExpRow = plRows.length + 1;
      plRows.push(["　農業費用合計","",{f:`SUM(C${expStartRow}:C${plExpRow-1})`}]);
      plRows.push([]);
      const plIncomeRow = 9;
      const plNetRow = plRows.length + 1;
      plRows.push(["農　業　所　得（青色申告特別控除前）","",{f:`C${plIncomeRow}-C${plExpRow}`}]);
      const plDedRow = plRows.length + 1;
      plRows.push(["青色申告特別控除（"+(Lg.blueMax/10000)+"万円・申告タブで変更可）","",{f:`MIN(${Lg.blueMax},MAX(0,C${plNetRow}))`}]);
      plRows.push(["控除後農業所得","",{f:`MAX(0,C${plNetRow}-C${plDedRow})`}]);
      plRows.push([]);
      plRows.push(["【参考】"]);
      plRows.push(["当年の経費（家事按分後）","",expTotal]);
      plRows.push(["うち減価償却費（農機具等）","",equipDepTotal]);
      plRows.push(["開業費合計（開業前支出）","",kaiTotal]);
      plRows.push(["※棚卸（期首・期末）は収支管理の「申告」タブで入力した金額を反映しています"]);
      const ws8 = XLSX.utils.aoa_to_sheet(plRows);
      ws8["!cols"]=[{wch:40},{wch:4},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws8, "損益計算書");

      // ── シート9: 貸借対照表（年末時点・推計含む） ──
      const { cardPayable, totalCardPayable, equipBookValue, cashEst, bankEst, receivable, kaimiShokyaku, motoire,
        jigyonushiKari, jigyonushiKashi, nextMotoire, totalAsset, totalLiabCap } = Lg;
      const equipDetails = depRows.map(x=>[x.eq.name, parseFloat(x.eq.price)||0, parseInt(x.eq.depYears)||0, String(x.eq.date).slice(0,10), x.annual, x.book]);

      const bsRows = [
        ["貸　借　対　照　表　"+WAREKI+"12月31日現在"],
        ["（個人事業主・農業所得用）　★印は自動計算、※印は推計値（通帳・現金の実際の残高を確認してください）"],
        [],
        ["【資産の部】","金額（円）","","【負債・資本の部】","金額（円）"],
        ["〈流動資産〉","","","〈流動負債〉",""],
        ["　現金（※推計）",cashEst,"","　未払金（カード・★自動）",totalCardPayable],
        ["　普通預金（※推計）",bankEst,"","　買掛金","0　←手入力"],
        ["　売掛金（未収金・★自動）",receivable,"","　前受金","0　←手入力"],
        ["　棚卸資産（★申告タブの期末棚卸）",invEnd,"","〈固定負債〉",""],
        ["〈固定資産〉","","","　長期借入金","0　←手入力"],
        ["　農機具等（帳簿価額★自動）",equipBookValue,"","",""],
        ["　開業費（未償却残高★自動）",kaimiShokyaku,"","〈資本の部〉",""],
        ["","","","　元入金（★期首）",motoire],
        ["","","","　事業主借（★電子マネー払い・個人資金の入金等）",jigyonushiKari],
        ["","","","　事業主貸（★引出し・家事按分の家事分）",-jigyonushiKashi],
        ["","","","　青色申告特別控除前の所得（★自動）",agriIncome],
        [],
        ["資産合計（※参考値）",totalAsset,"","負債・資本合計（※参考値）",totalLiabCap],
        [],
        ["【注意事項・確認手順】"],
        ["①現金・普通預金は開業後の記録からの推計です。実際の残高（通帳・現金）と照合してください"],
        ["②農機具等は耐用年数を設定したものを定額法（法定償却率・使い始めた年は月割り）で自動計算しています"],
        ["③カード未払金は年末までの購入で、引き落とし日が翌年以降のものを集計しています"],
        ["④開業費は5年均等（開業年は月割り）で計算。開業費は任意償却なので金額は調整できます"],
        ["⑤元入金（翌年期首）＝期首元入金＋所得＋事業主借－事業主貸 を自動で保存します"],
        ["⑥借入金・買掛金・棚卸資産などは実績に応じて手入力してください"],
        ["⑦資産合計と負債・資本合計の差は、推計できない残高（手持ち現金・預金の期首残高など）です"],
      ];
      if(equipDetails.length > 0){
        bsRows.push([]);
        bsRows.push(["【農機具等　減価償却明細（★自動計算）】"]);
        bsRows.push(["名称","取得価額","耐用年数","取得日","当年償却額","年末帳簿価額"]);
        equipDetails.forEach(r=>bsRows.push(r));
        bsRows.push(["合計","","","",equipDepTotal,equipBookValue]);
      }
      if(Object.keys(cardPayable).length > 0){
        bsRows.push([]);
        bsRows.push(["【カード別未払金内訳（★自動）】"]);
        Object.entries(cardPayable).forEach(([card,amt])=>bsRows.push(["　"+card, amt]));
      }
      const prevNext = readMotoireMap()[YS];
      if(prevNext==null || Number(prevNext)===Math.round(nextMotoire) ||
         window.confirm((Y+1)+"年の期首元入金を "+Math.round(nextMotoire).toLocaleString()+"円 に更新しますか？\n（現在の保存値："+Number(prevNext).toLocaleString()+"円）\n手動で修正した値を残す場合は「キャンセル」")){
        setOpeningMotoire(Y+1, nextMotoire);
      }

      const ws9 = XLSX.utils.aoa_to_sheet(bsRows);
      ws9["!cols"]=[{wch:28},{wch:14},{wch:3},{wch:34},{wch:16}];
      XLSX.utils.book_append_sheet(wb, ws9, "貸借対照表");

      // ── シート10: 家事按分明細 ──
      const apRates = (()=>{ try { return JSON.parse(localStorage.getItem("apportionRates")||"{}"); } catch { return {}; } })();
      const apMasters = (()=>{ try { return JSON.parse(localStorage.getItem("apportionMasters")||"[]"); } catch { return []; } })();
      const apItems = postOpen.filter(c=>apRates[c.id] !== undefined && apRates[c.id] < 100);
      const apRows = [
        ["家事按分明細（"+WAREKI+"分）"],
        ["農業と家事で共用する支出の按分内訳"],
        ["日付","内容","支払総額（円）","農業割合（%）","農業費用額（円）","家事費用額（円）","按分理由"],
        ...apItems.map(c=>{
          const r = apRates[c.id];
          const total = Number(c.amt)||0;
          const agri = Math.round(total*r/100);
          const kaji = total - agri;
          // 按分マスターから理由を探す
          const masterMatch = apMasters.find(m=>c.note&&c.note.includes("[按分"+m.rate+"%]")&&m.rate===r);
          const reason = masterMatch ? masterMatch.reason : ("[按分"+r+"%]");
          return [c.date||"", c.name+(c.note?" "+c.note:""), total, r, agri, kaji, reason];
        }),
      ];
      if(apItems.length > 0){
        const apTotalAmt = apItems.reduce((s,c)=>s+(Number(c.amt)||0),0);
        const apTotalAgri = apItems.reduce((s,c)=>s+Math.round((Number(c.amt)||0)*(apRates[c.id]||100)/100),0);
        const apTotalKaji = apTotalAmt - apTotalAgri;
        apRows.push(["合計","",apTotalAmt,"",apTotalAgri,apTotalKaji,""]);
      }
      const ws10 = XLSX.utils.aoa_to_sheet(apRows);
      ws10["!cols"]=[{wch:10},{wch:30},{wch:14},{wch:12},{wch:14},{wch:14},{wch:25}];
      XLSX.utils.book_append_sheet(wb, ws10, "家事按分明細");

      // ── 農薬使用記録（参考・当年分・作付けごと）※提出用は「🌿 農薬記録書」から出力 ──
      const pestLogs = logs.filter(l => isPestWork(l.work) && l.pestName && (l.date||"").startsWith(YS));
      const pestByCrop = {};
      pestLogs.forEach(l => { const k=l.cropId||"__none__"; (pestByCrop[k]=pestByCrop[k]||[]).push(l); });
      const usedPestNames = new Set();
      if(Object.keys(pestByCrop).length > 0){
        Object.entries(pestByCrop).forEach(([cid, cLogs]) => {
          const cropObj = crops.find(c=>c.id===cid);
          const cName = cropObj ? getCropName(cropObj)+(cropObj.variety?" "+cropObj.variety:"") : "品目なし";
          let sheetName = ("農薬記録_"+cName).replace(/[\\/:*?"<>|\[\]]/g,"").slice(0,28);
          for(let k=2; usedPestNames.has(sheetName); k++) sheetName = sheetName.slice(0,25)+"("+k+")";
          usedPestNames.add(sheetName);
          const field = cropObj && cropObj.fieldIdx !== undefined ? fields[cropObj.fieldIdx] : null;
          const pestRows = [
            ["農薬使用記録（"+WAREKI+"・参考）　※提出用は収支管理の「🌿 農薬記録書」から出力してください"],
            ["作物名", cName, "", "播種日", (cropObj&&cropObj.sowDate)||"", "定植日", (cropObj&&cropObj.plantDate)||""],
            ["圃場名", field?field.name||"":"", "", "作付け面積（㎡）", (cropObj&&cropObj.cultivationArea)||""],
            [],
            ["月", "日", "使用薬剤名", "対象病害虫", "剤型", "希釈倍数", "散布量"],
          ];
          cLogs.sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(l => {
            const [, mm, dd] = String(l.date||"").split("-");
            const pm = pestMs.find(p=>p.name===l.pestName)||{};
            pestRows.push([mm?Number(mm):"", dd?Number(dd):"", l.pestName||"", l.pestTarget||"", pm.formType||"", l.pestDil||"", [l.pestAmt,l.pestUnit].filter(Boolean).join("")]);
          });
          const wsPest = XLSX.utils.aoa_to_sheet(pestRows);
          wsPest["!cols"]=[{wch:5},{wch:5},{wch:22},{wch:16},{wch:10},{wch:10},{wch:10}];
          XLSX.utils.book_append_sheet(wb, wsPest, sheetName);
        });
      }

      const fname="サクメモ_青色申告帳簿_"+YS+"年分.xlsx";
      XLSX.writeFile(wb, fname);
      showToast("複式簿記帳簿Excelを書き出しました（"+fname+"）");
    };

    if(window.XLSX){
      doExport(window.XLSX);
    } else {
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
      s.onload=()=>doExport(window.XLSX);
      s.onerror=()=>showToast("ライブラリの読み込みに失敗しました");
      document.head.appendChild(s);
    }
  };

  const cropName = id => {if(!id)return"共通";const c=crops.find(x=>x.id===id);if(!c)return"共通";const db=CDB[c.type]||{};return(db.e||"🌱")+" "+(db.n||c.type)+(c.variety?"("+c.variety+")":"");};

  const PEST_TMPL_B64 = "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";

  const exportPestRecord = (targetCropId) => {
    // 会員番号・栽培者名をlocalStorageに保存
    try { localStorage.setItem("pestMemberNo", pestExportMemberNo); } catch{}
    try { localStorage.setItem("pestGrowerName", pestExportGrowerName); } catch{}

    // 剤型テキスト生成（テンプレートのG列書式に合わせて該当剤型に○をつける）
    const buildFormTypeStr = (formType) => {
      const types = ["乳剤","水和剤","水溶剤","フロアブル剤","粒剤","その他"];
      return "("+types.map(t => t === formType ? "○"+t : t).join("・")+"）";
    };

    const doPestExport = async (ExcelJS) => {
      // テンプレートをbase64から読み込む
      const bin = atob(PEST_TMPL_B64);
      const arr = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);

      // 対象ログを取得
      const pestLogs = logs.filter(l => isPestWork(l.work) && (targetCropId ? l.cropId === targetCropId : true));
      const pestByCrop = {};
      pestLogs.forEach(l => {
        const key = l.cropId || "__unknown__";
        if(!pestByCrop[key]) pestByCrop[key] = [];
        pestByCrop[key].push(l);
      });
      if(Object.keys(pestByCrop).length === 0){
        showToast("防除作業の記録がまだありません");
        return;
      }

      // ファイル名用
      const toDateStr8 = s => s ? s.replace(/-/g,"") : ""; // "2026-09-16" → "20260916"
      const firstCropId = Object.keys(pestByCrop)[0];
      const firstCrop = crops.find(x=>x.id===firstCropId);
      const firstCropObj = (() => {
        if(!firstCrop) return "農薬記録";
        return getCropName(firstCrop)+(firstCrop.variety?" "+firstCrop.variety:"");
      })();
      // ファイル名の期間：播種日または定植日 〜 収穫日（実績 or 予定）
      const periodStr = (()=>{
        const startDate = firstCrop ? (firstCrop.sowDate||firstCrop.plantDate||"") : "";
        const harvestActual = firstCrop ? (firstCrop.harvestDate||"") : "";
        const harvestEst = pestExportHarvestDate||"";
        const endDate = harvestActual||harvestEst;
        if(startDate||endDate){
          return (toDateStr8(startDate)||"")+(startDate&&endDate?"〜":"")+(toDateStr8(endDate)||"");
        }
        // どちらもなければ農薬散布の日付範囲にフォールバック
        const pestDates = logs.filter(l=>isPestWork(l.work)&&(targetCropId?l.cropId===targetCropId:true)&&l.date).map(l=>l.date).sort();
        return pestDates.length>0
          ? toDateStr8(pestDates[0])+"〜"+toDateStr8(pestDates[pestDates.length-1])
          : String(new Date().getFullYear());
      })();
      const fname = (Object.keys(pestByCrop).length===1?firstCropObj:"複数品目")+"_農薬記録_"+periodStr+".xlsx";

      // 品目ごと・24行（テンプレートの11〜34行）ごとに1シート。書式保持のためテンプレートを毎回ロードする
      const PAGE_ROWS = 24;
      const usedNames = new Set();
      const uniqName = (base) => {
        const b = (String(base).replace(/[\\/:*?"<>|\[\]]/g,"").trim() || "品目").slice(0,26);
        let n=b, k=2; while(usedNames.has(n)){ n=b.slice(0,24)+"("+k+")"; k++; }
        usedNames.add(n); return n;
      };
      const pageBufs = [];
      for(const [cId, cLogs] of Object.entries(pestByCrop)){
        const cropObj = crops.find(c => c.id === cId);
        const field = cropObj && cropObj.fieldIdx !== undefined ? fields[cropObj.fieldIdx] : null;
        const cropNameStr = cropObj ? getCropName(cropObj) : "不明";
        const cropLabel = cropNameStr+(cropObj&&cropObj.variety?" "+cropObj.variety:"");
        const cropVariety = cropObj ? (cropObj.variety||"") : "";
        // 日付順→同日内はマスター登録順
        const sortedLogs = [...cLogs].sort((a,b)=>{
          const dateCmp = (a.date||"").localeCompare(b.date||"");
          if(dateCmp!==0) return dateCmp;
          const ai = pestMs.findIndex(p=>p.name===a.pestName);
          const bi = pestMs.findIndex(p=>p.name===b.pestName);
          return (ai>=0?ai:9999)-(bi>=0?bi:9999);
        }).filter(l=>l.pestName);
        const pages = Math.max(1, Math.ceil(sortedLogs.length/PAGE_ROWS));
        for(let pg=0; pg<pages; pg++){
          const tmplWb = new ExcelJS.Workbook();
          await tmplWb.xlsx.load(arr.buffer);
          const tmplWs = tmplWb.worksheets[0];
          const sc = (addr, val) => { tmplWs.getCell(addr).value = val; };
          const scF = (addr, val, fontSize) => {
            const c = tmplWs.getCell(addr); c.value = val;
            if(fontSize && c.font) c.font = {...c.font, size: fontSize};
            else if(fontSize) c.font = {size: fontSize, name:"ＭＳ Ｐゴシック"};
          };
          const mStr = d => (d.getMonth()+1)+"月";
          const dStr = d => d.getDate()+"日";
          const ymd = s => { const [y,m,d]=String(s).slice(0,10).split("-").map(Number); return {y,m,d}; };
          // ヘッダー
          sc("B3", pestExportMemberNo);
          sc("K3", cropNameStr);
          sc("N3", " 品種名　（"+(cropVariety||"　　　　")+"）");
          sc("B4", pestExportGrowerName);
          if(cropObj?.sowDate){ const t=ymd(cropObj.sowDate); sc("K4", t.y); sc("M4", t.m); sc("O4", t.d); }
          sc("B5", field ? field.name||"" : "");
          if(cropObj?.plantDate){ const t=ymd(cropObj.plantDate); sc("K5", t.y); sc("M5", t.m); sc("O5", t.d); }
          // 栽培面積：アプリの作付け面積は㎡ → テンプレートの「㎡」欄（F6）に入れる（B6はa、D6は坪の欄）
          if(cropObj?.cultivationArea) sc("F6", String(cropObj.cultivationArea));
          if(pestExportHarvestDate){ const t=ymd(pestExportHarvestDate); scF("K6", t.y, 11); sc("M6", t.m); sc("O6", t.d); }
          // 防除記録（11〜34行）
          sortedLogs.slice(pg*PAGE_ROWS, (pg+1)*PAGE_ROWS).forEach((l, i) => {
            const rowNum = 11 + i;
            const t = l.date ? ymd(l.date) : null;
            const pm = pestMs.find(p=>p.name===l.pestName)||{};
            sc("A"+rowNum, t ? t.m+"月"+t.d+"日" : "");
            sc("B"+rowNum, l.pestName||"");
            sc("G"+rowNum, buildFormTypeStr(pm.formType || ""));
            sc("J"+rowNum, l.pestDil||"");
            sc("K"+rowNum, [l.pestAmt, l.pestUnit].filter(Boolean).join(""));
          });
          tmplWs.name = uniqName(cropLabel + (pages>1 ? "_"+(pg+1)+"枚目" : ""));
          pageBufs.push(await tmplWb.xlsx.writeBuffer());
        }
      }

      // 1シートならそのまま、複数なら1つのブックにまとめる（結合セル・印刷設定もコピー）
      let finalBuf;
      if(pageBufs.length === 1){
        finalBuf = pageBufs[0];
      } else {
        const baseWb = new ExcelJS.Workbook();
        await baseWb.xlsx.load(pageBufs[0]);
        for(let i=1;i<pageBufs.length;i++){
          const addWb = new ExcelJS.Workbook();
          await addWb.xlsx.load(pageBufs[i]);
          const addWs = addWb.worksheets[0];
          const newWs = baseWb.addWorksheet(addWs.name);
          const model = addWs.model;
          const merges = (model.merges||[]).slice();
          model.name = newWs.name; model.id = newWs.id; model.orderNo = newWs.orderNo;
          newWs.model = model;
          merges.forEach(r=>{ try{ newWs.mergeCells(r); }catch{} });
        }
        finalBuf = await baseWb.xlsx.writeBuffer();
      }

      // ダウンロード
      const blob = new Blob([finalBuf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fname; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 5000);
      showToast("農薬使用記録簿を出力しました");
    };

    const runExport = () => {
      if(window.ExcelJS){ doPestExport(window.ExcelJS).catch(e=>showToast("出力エラー: "+e.message)); }
      else {
        const s=document.createElement("script");
        s.src="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
        s.onload=()=>doPestExport(window.ExcelJS).catch(e=>showToast("出力エラー: "+e.message));
        s.onerror=()=>showToast("ライブラリの読み込みに失敗しました");
        document.head.appendChild(s);
      }
    };
    runExport();
  };
  // ─── 申告確認タブ用ヘルパーコンポーネント ───
  const LedgerRow = ({label,val,sub,bold})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem",fontWeight:bold?700:400}}>
      <span style={{color:sub?TX3:"inherit",paddingLeft:sub?12:0}}>{label}</span>
      <span style={{fontWeight:bold?700:400}}>{typeof val==="number"?val.toLocaleString()+"円":val}</span>
    </div>
  );
  const LedgerSecHd = ({label})=>(
    <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",margin:"14px 0 6px"}}>{label}</div>
  );

  const thStyle = k => ({fontSize:".64rem",color:sortKey===k?G:TX3,cursor:"pointer",userSelect:"none",padding:"2px 4px",fontWeight:sortKey===k?700:400});

  return (
    <div style={S.scr} className="scr-inner">

      {/* メインタブ */}
      <div style={{display:"flex",gap:0,marginBottom:10,borderRadius:8,overflow:"hidden",border:"1px solid #e0d9ce",overflowX:"auto"}}>
        {[["cost","💰 費用"],["stock","📦 在庫"],["equip","🔧 農具"],["ledger","📊 申告"],["cashflow","📈 資金"],["subsidy","🎯 補助金"]].map(([v,l])=>(
          <button key={v} onClick={()=>setMainTab(v)}
            style={{flex:"0 0 auto",padding:"8px 10px",border:"none",background:mainTab===v?G:"#fff",
              color:mainTab===v?"#fff":"#888",fontWeight:mainTab===v?700:400,
              fontSize:".75rem",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{l}</button>
        ))}
      </div>

      {/* ヘッダー */}
      <div style={{...S.sec,flexWrap:"wrap",gap:6}}>
        <span style={{fontFamily:"'Shippori Mincho B1',serif"}}>💰 収支管理</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <button style={{...S.secBtn,background:"#8B6914",color:"#fff"}} onClick={()=>setMCost({...empty})}>＋ 費用</button>
          <button style={{...S.secBtn,background:"#2E7D32",color:"#fff"}} onClick={()=>setMCost({...empty,cat:"inc_crop"})}>＋ 収入</button>
          <button style={{...S.secBtn,background:"#1565C0",color:"#fff"}} onClick={exportLedger}>📥 帳簿Excel</button>
          <button style={{...S.secBtn,background:"#2E7D32",color:"#fff"}} onClick={()=>{setPestExportCropId("");setShowPestExportModal(true);}}>🌿 農薬記録書</button>
        </div>
      </div>

      {/* 期間切り替え */}
      <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e0d9ce",flexShrink:0}}>
          {[["year","年単位"],["month","月単位"]].map(([v,l])=>(
            <button key={v} onClick={()=>setUnit(v)} style={{padding:"5px 12px",border:"none",background:unit===v?G:"#fff",color:unit===v?"#fff":"#888",fontWeight:unit===v?700:400,fontSize:".76rem",cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
        {unit==="year"&&(
          <select value={selYear} onChange={e=>setSelYear(e.target.value)} style={{...S.inp,width:"auto",padding:"4px 8px"}}>
            {years.map(y=><option key={y} value={y}>{y}年</option>)}
          </select>
        )}
        {unit==="month"&&(
          <div style={{display:"flex",gap:4}}>
            <select value={selMon.slice(0,4)} onChange={e=>setSelMon(e.target.value+"-"+selMon.slice(5,7))} style={{...S.inp,width:"auto",padding:"4px 8px"}}>
              {years.map(y=><option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={selMon} onChange={e=>setSelMon(e.target.value)} style={{...S.inp,width:"auto",padding:"4px 8px"}}>
              {months.map(m=><option key={m} value={m}>{parseInt(m.slice(5))}月</option>)}
            </select>
          </div>
        )}
      </div>

      {/* 損益サマリー（会計ソフト形式） */}
      <div style={{...S.card,padding:"12px 14px",marginBottom:8}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          <div style={{textAlign:"center",background:"#E8F5E9",borderRadius:10,padding:"10px 4px"}}>
            <div style={{fontSize:".64rem",color:"#388E3C",fontWeight:700,marginBottom:2}}>💵 収入合計</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:"#1B5E20"}}>{Math.round(incomeTotal).toLocaleString()}<span style={{fontSize:".65rem"}}>円</span></div>
          </div>
          <div style={{textAlign:"center",background:"#FFF3E0",borderRadius:10,padding:"10px 4px"}}>
            <div style={{fontSize:".64rem",color:"#E65100",fontWeight:700,marginBottom:2}}>💰 費用合計</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:"#BF360C"}}>{Math.round(total).toLocaleString()}<span style={{fontSize:".65rem"}}>円</span></div>
          </div>
          <div style={{textAlign:"center",background:incomeTotal-total>=0?"#E3F2FD":"#FFEBEE",borderRadius:10,padding:"10px 4px"}}>
            <div style={{fontSize:".64rem",color:incomeTotal-total>=0?"#1565C0":"#C62828",fontWeight:700,marginBottom:2}}>{incomeTotal-total>=0?"📈 農業所得":"📉 農業所得"}</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:incomeTotal-total>=0?"#0D47A1":"#B71C1C"}}>{Math.round(incomeTotal-total).toLocaleString()}<span style={{fontSize:".65rem"}}>円</span></div>
          </div>
        </div>

        {assetBuyTotal>0&&<div style={{fontSize:".68rem",color:"#7c4d00",background:"#fff8e8",borderRadius:6,padding:"5px 8px",marginBottom:6}}>
          🚜 耐用年数のある農機具の購入 {Math.round(assetBuyTotal).toLocaleString()}円 は、費用合計に含めず「申告」タブで毎年の減価償却費として計上します
        </div>}
        {/* 費用内訳バー */}
        {total>0&&<div>
          <div style={{fontSize:".68rem",color:"#888",marginBottom:4}}>費用内訳</div>
          <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:4}}>
            {COST_CATS.map((cat,i)=>{
              const v=byCat[cat.value]||0;
              const pct=total>0?v/total*100:0;
              const cols=CAT_BAR_COLORS;
              return pct>0?<div key={cat.value} style={{width:pct+"%",background:cols[i],transition:"width .5s"}}/>:null;
            })}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px"}}>
            {COST_CATS.filter(cat=>(byCat[cat.value]||0)>0).map((cat,i)=>{
              const cols=CAT_BAR_COLORS;
              const ci=COST_CATS.indexOf(cat);
              return <div key={cat.value} style={{fontSize:".62rem",display:"flex",alignItems:"center",gap:3}}>
                <span style={{width:8,height:8,borderRadius:2,background:cols[ci],display:"inline-block"}}/>
                {cat.label.replace(/^[^\s]+\s/,"")}: {Math.round(byCat[cat.value]).toLocaleString()}円
              </div>;
            })}
          </div>
        </div>}
      </div>

      {mainTab==="cost"&&<>
      {/* フィルタータブ */}
      <div style={{display:"flex",gap:0,marginBottom:8,borderRadius:8,overflow:"hidden",border:"1px solid #e0d9ce"}}>
        {[["all","すべて"],["income","収入"],["expense","費用"],["card","カード"],["emoney","電子マネー"],["receivable","未収金"]].map(([v,l])=>(
          <button key={v} onClick={()=>setCostTab(v)}
            style={{flex:1,padding:"5px 0",border:"none",background:costTab===v?G:"#fff",
              color:costTab===v?"#fff":"#888",fontWeight:costTab===v?700:400,
              fontSize:".68rem",cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
        ))}
      </div>

      <SearchBox value={costQ} onChange={setCostQ} placeholder="🔍 品名・メモ・カテゴリ・金額などで検索"/>
      {/* ソート */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:".7rem",color:TX3}}>{viewList.length}件{costWords.length>0&&baseList.length!==viewList.length?"（全"+baseList.length+"件中）":""}</span>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:".68rem",color:TX3}}>並び替え</span>
          <select value={sortKey} onChange={e=>setSortKey(e.target.value)} style={{...S.inp,width:"auto",padding:"2px 6px",fontSize:".72rem"}}>
            {[["date","日付"],["amt","金額"],["cat","カテゴリ"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* 取引一覧 */}
      <div style={{...S.card,padding:0,overflow:"hidden"}}>
        {/* 列ヘッダー */}
        <div style={{display:"grid",gridTemplateColumns:"52px 1fr auto 32px",gap:"0 6px",borderBottom:"2px solid #e0d9ce",background:"#f0ebe3",padding:"5px 8px"}}>
          <div style={{fontSize:".64rem",color:"#5c3d1e",fontWeight:700}}>日付</div>
          <div style={{fontSize:".64rem",color:"#5c3d1e",fontWeight:700}}>内容</div>
          <div style={{fontSize:".64rem",color:"#5c3d1e",fontWeight:700,textAlign:"right"}}>金額（円）</div>
          <div/>
        </div>
        {viewList.length===0&&<div style={{color:"#aaa",fontSize:".78rem",textAlign:"center",padding:"20px 0"}}>取引がありません</div>}
        {viewList.map((c,i)=>{
          const inc = isIncome(c.cat);
          const cat = inc
            ? INCOME_CATS.find(x=>x.value===c.cat)||{label:"収入",value:"inc"}
            : COST_CATS.find(x=>x.value===c.cat)||{label:"費用",value:"other"};
          const cr=crops.find(x=>x.id===c.cropId);
          const crName=cr?getCropName(cr):"";
          const isCancelled = c.cancelled;
          const isCard = c.payMethod&&cards&&cards.some&&cards.some(cd=>cd.name===c.payMethod);
          const kaigyoDateForList = (()=>{try{return localStorage.getItem("sakumemo_kaigyo_date")||"";}catch{return "";}})();
          const isKaigyo = !inc && kaigyoDateForList && c.date && c.date < kaigyoDateForList;
          const bg = isCancelled?"#F5F5F5":isKaigyo?"#FFF8E8":i%2===0?"#FFFFFF":"#FAFAFA";
          return (
            <div key={c.id} onClick={()=>setMCost({...c, _buyQty:c.stockQty||"", _buyUnitPrice:undefined, _buyOpen:!!c.masterId})}
              style={{display:"grid",gridTemplateColumns:"52px 1fr auto 32px",gap:"0 6px",
                padding:"7px 8px",borderBottom:"1px solid #f0ebe3",
                background:bg,cursor:"pointer",alignItems:"center",
                opacity:isCancelled?0.5:1}}>
              {/* 日付 */}
              <div>
                <div style={{fontSize:".68rem",color:"#5c3d1e",whiteSpace:"nowrap"}}>{c.date?c.date.slice(5).replace("-","/"):"-"}</div>
                {isCard&&<div style={{fontSize:".55rem",color:"#1565C0"}}>💳</div>}
                {isEmoneyPM(c.payMethod)&&<div style={{fontSize:".55rem",color:"#7B1FA2"}}>📱</div>}
                {isKaigyo&&<div style={{fontSize:".52rem",color:"#7c4d00",fontWeight:700}}>開業費</div>}
              </div>
              {/* 内容 */}
              <div style={{minWidth:0}}>
                <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:1,flexWrap:"wrap"}}>
                  <span style={{fontSize:".58rem",background:inc?"#E8F5E9":isKaigyo?"#FFF0C0":"#FFF3E0",
                    color:inc?"#2E7D32":isKaigyo?"#7c4d00":"#E65100",borderRadius:3,padding:"0 4px",fontWeight:700,flexShrink:0}}>
                    {isKaigyo?"🏪開業費":cat.label.split(" ")[0]}
                  </span>
                  {isCancelled&&<span style={{fontSize:".58rem",background:"#EEE",color:"#999",borderRadius:3,padding:"0 4px"}}>取消</span>}
                </div>
                <div style={{fontSize:".74rem",fontWeight:700,color:isCancelled?"#999":"#1c1a14",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||"（内容なし）"}</div>
                {crName&&<div style={{fontSize:".6rem",color:TX3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{crName}</div>}
                {c.payDate&&<div style={{fontSize:".55rem",color:"#1565C0"}}>引落：{c.payDate.slice(5).replace("-","/")}</div>}
              </div>
              {/* 金額 */}
              <div style={{textAlign:"right",whiteSpace:"nowrap"}}>
                <div style={{fontSize:".82rem",fontWeight:700,
                  color:isCancelled?"#999":inc?"#1B5E20":"#B71C1C",
                  textDecoration:isCancelled?"line-through":"none"}}>
                  {inc?"+":"-"}{Math.round(parseFloat(c.amt)||0).toLocaleString()}
                </div>
              </div>
              {/* 複製・入金済みボタン */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <button onClick={e=>{e.stopPropagation();setMCost({...c,id:undefined,date:todayStr(),cancelled:false,payDate:"",isReceivable:false,receivableDate:"",apportionRate:(()=>{try{const r=JSON.parse(localStorage.getItem("apportionRates")||"{}")[c.id];return r!==undefined?Number(r):c.apportionRate;}catch{return c.apportionRate;}})()});showToast("複製しました。内容を確認して保存してください");}}
                  title="複製"
                  style={{fontSize:"1rem",lineHeight:1,border:"none",background:"none",cursor:"pointer",padding:"4px",color:"#9b59b6"}}>📋</button>
                {costTab==="receivable"&&c.isReceivable&&<button onClick={e=>{e.stopPropagation();const updated={...c,isReceivable:false,receivableDate:""};setCosts(costs.map(x=>x.id===c.id?updated:x),updated);showToast("入金済みにしました");}}
                  style={{fontSize:".6rem",background:"#E8F5E9",color:"#2E7D32",border:"1px solid #A5D6A7",borderRadius:6,padding:"2px 4px",cursor:"pointer",whiteSpace:"nowrap"}}>入金済</button>}
              </div>
            </div>
          );
        })}
      </div>
      </>}

      {/* ── 在庫管理タブ ── */}
      {mainTab==="stock"&&<>
        {/* 在庫一覧 - 閲覧専用 */}
        <div style={{fontSize:".72rem",color:TX3,background:"#f0f9f0",borderRadius:8,padding:"8px 10px",marginBottom:10,lineHeight:1.6}}>
          📦 在庫は<b>費用タブ</b>から購入を記録すると自動加算されます。資材の新規登録も費用タブから行ってください。
        </div>
        <button onClick={openRecalc} style={{...S.btn,background:"#fff",color:"#2d6a3f",border:"1px solid #a5d6a7",borderRadius:8,width:"100%",padding:"8px 0",fontSize:".78rem",fontWeight:700,marginBottom:10}}>
          🔄 在庫を購入・作業記録から再計算する
        </button>
        <ModalWithSave open={showRecalc} onClose={()=>setShowRecalc(false)} title="🔄 在庫の再計算" onSave={applyRecalc} saveLabel="選んだ行を反映">
          {showRecalc&&(()=>{ const rows=buildRecalcRows(); return <>
            <div style={{fontSize:".72rem",color:"#555",lineHeight:1.7,marginBottom:8,background:"#f0f9f0",borderRadius:8,padding:"8px 10px"}}>
              <b>計算上の在庫 ＝ 購入の合計 − 作業記録の使用量の合計</b>。在庫機能ができる前の購入・作業記録も数えます。
              実際の残量がわかるときは「実際の残量」に入れると、計算より優先して反映します。反映するまで在庫は変わりません。
            </div>
            {rows.length===0&&<div style={{color:TX3,fontSize:".82rem",padding:16,textAlign:"center"}}>購入・作業記録のある資材がありません</div>}
            {rows.map(r=>{
              const diff = Math.abs(Math.max(0,r.calc)-r.cur)>0.0001;
              return <div key={r.key} style={{border:"1px solid "+(diff?"#f0c040":"#e0d9ce"),background:diff?"#fffdf2":"#fff",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:".8rem",fontWeight:700,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!recalcSel[r.key]} onChange={e=>setRecalcSel({...recalcSel,[r.key]:e.target.checked})}/>
                  {r.m.name}<span style={{fontSize:".62rem",fontWeight:400,color:TX3}}>{r.kind==="fert"?"肥料":isHormoneMaster(r.m)?"ホルモン剤":"農薬"}</span>
                </label>
                <div style={{fontSize:".72rem",color:TX3,marginTop:4,lineHeight:1.7}}>
                  購入 +{r.bought}{r.unit}（{r.nBuy}件）／ 使用 −{r.used}{r.unit}（{r.nUse}件）<br/>
                  計算上 <b style={{color:r.calc<0?"#dc2626":"#2d6a3f"}}>{r.calc<0?"0（マイナス "+r.calc+"）":r.calc}{r.unit}</b> ／ 現在 <b>{r.cur}{r.unit}</b>
                  {r.nBuy===0&&<span style={{color:"#b45309"}}>　⚠️購入の記録がないため計算できません</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,fontSize:".72rem"}}>
                  <span style={{color:TX3,whiteSpace:"nowrap"}}>実際の残量</span>
                  <input type="number" inputMode="decimal" value={recalcActual[r.key]??""} placeholder="任意"
                    onChange={e=>{ setRecalcActual({...recalcActual,[r.key]:e.target.value}); if(e.target.value!=="") setRecalcSel({...recalcSel,[r.key]:true}); }}
                    style={{...S.inp,width:90,padding:"3px 6px",fontSize:".78rem"}}/>
                  <span style={{color:TX3}}>{r.unit}</span>
                </div>
              </div>;
            })}
          </>; })()}
        </ModalWithSave>
        {[...fertMs.map((f,i)=>({...f,_type:"fert",_idx:i})),...pestMs.map((p,i)=>({...p,_type:"pest",_idx:i})),...materialMs.map((m,i)=>({...m,_type:"material",_idx:equips.indexOf(m)}))].length===0
          &&<div style={{color:TX3,fontSize:".82rem",padding:20,textAlign:"center"}}>
            肥料・農薬・消耗資材がまだ登録されていません<br/>費用タブで肥料費・農薬費を入力すると自動登録されます
          </div>
        }
        <SearchBox value={stockQ} onChange={setStockQ} placeholder="🔍 資材名・種類・メモで検索"/>
        {(()=>{ const w=stockQ.trim().split(/\s+/).filter(Boolean); if(!w.length) return null;
          const n=[...fertMs,...pestMs,...materialMs].filter(x=>{const h=[x.name,x.type,x.cat,x.note,x.status];return w.every(k=>h.some(t=>matchM(String(t||""),k)));}).length;
          return n===0?<div style={{color:TX3,fontSize:".82rem",padding:20,textAlign:"center"}}>「{stockQ}」に合う資材はありません</div>:null; })()}
        {[...fertMs.map((f,i)=>({...f,_type:"fert",_idx:i})),...pestMs.map((p,i)=>({...p,_type:"pest",_idx:i})),...materialMs.map((m)=>({...m,_type:"material",_idx:equips.indexOf(m)}))]
          .filter(x=>{ const w=stockQ.trim().split(/\s+/).filter(Boolean); if(!w.length) return true; const h=[x.name,x.type,x.cat,x.note,x.status]; return w.every(k=>h.some(t=>matchM(String(t||""),k))); })
          .sort((a,b)=>{
            const aOut = a.status==="使い切り（非表示）"?1:0;
            const bOut = b.status==="使い切り（非表示）"?1:0;
            return aOut-bOut;
          })
          .map((item)=>{
          const stock = parseFloat(item.stock)||0;
          const su = masterUnitOf(item); // 在庫は購入時に記録した内容量の単位で表示
          const cap = parseFloat(item.capacity)||0;
          const stockVal = stockValueOf(item);
          const isOut = item.status==="使い切り（非表示）";
          const isFert = item._type==="fert";
          const isMaterial = item._type==="material";
          const borderColor = isFert?"#6ee7b7":isMaterial?"#a78bfa":"#fcd34d";
          const bgColor = isFert?"#d1fae5":isMaterial?"#ede9fe":"#fef3c7";
          const tcColor = isFert?"#065f46":isMaterial?"#5b21b6":"#92400e";
          // 在庫バー（内容量1個分＝100%基準、容量未設定なら現在の在庫＝100%）
          const maxStock = cap>0 ? cap : (stock>0?stock:1);
          const barPct = stock>0 ? Math.min(100, stock/maxStock*100) : 0;
          const barColor = stock<=0?"#ef4444":barPct<20?"#f97316":barPct<50?"#eab308":"#22c55e";
          return (
            <div key={item.id||item._idx} style={{...S.card,borderLeft:"4px solid "+borderColor,opacity:isOut?0.55:1}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <span style={{fontSize:"1.5rem",lineHeight:1.2}}>{isFert?"🌿":isMaterial?"📦":"🐛"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:".9rem"}}>{item.name}</span>
                    <span style={{fontSize:".62rem",fontWeight:700,padding:"1px 6px",borderRadius:999,background:bgColor,color:tcColor}}>{isMaterial?(item.cat||"消耗資材"):item.type||""}</span>
                    {isOut&&<span style={{fontSize:".62rem",background:"#fee2e2",color:"#991b1b",borderRadius:999,padding:"1px 6px",fontWeight:700}}>使い切り</span>}
                  </div>
                  {/* 在庫バー */}
                  <div style={{marginTop:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:".7rem",marginBottom:2}}>
                      <span style={{color:TX3}}>在庫</span>
                      <span style={{fontWeight:700,color:stock<=0?"#ef4444":TX3}}>{stock}{su}{stockVal>0?` ≒ ${stockVal.toLocaleString()}円`:""}</span>
                    </div>
                    <div style={{background:"#e5e7eb",borderRadius:4,height:6,overflow:"hidden"}}>
                      <div style={{width:barPct+"%",background:barColor,height:"100%",transition:"width .4s"}}/>
                    </div>
                  </div>
                  <div style={{marginTop:5,display:"flex",gap:8,flexWrap:"wrap",fontSize:".72rem",color:TX3}}>
                    {item.capacity&&<span>📦 {item.capacity}{item.cunit}/個</span>}
                    {item.price&&<span>💴 {item.price}円/個</span>}
                    {item.note&&<span>{item.note}</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginTop:9,flexWrap:"wrap"}}>
                {!isOut&&<button
                  style={{...S.btn,background:"#fee2e2",color:"#991b1b",border:"1px solid #fca5a5",padding:"5px 10px",fontSize:".73rem",borderRadius:8,width:"auto",fontWeight:700}}
                  onClick={()=>{
                    if(!window.confirm(`「${item.name}」を使い切りにしますか？\n在庫を0にして非表示に変更します`))return;
                    const updated={...item,stock:"0",status:"使い切り（非表示）"};
                    if(item._type==="fert") setFertMs(fertMs.map((x,i)=>i===item._idx?updated:x),updated);
                    else if(item._type==="material") setEquips(equips.map((x,i)=>i===item._idx?updated:x),updated);
                    else setPestMs(pestMs.map((x,i)=>i===item._idx?updated:x),updated);
                    showToast(item.name+"を使い切りにしました");
                  }}>
                  ✅ 使い切り
                </button>}
                {isOut&&<button
                  style={{...S.btn,background:"#d1fae5",color:"#065f46",border:"1px solid #6ee7b7",padding:"5px 10px",fontSize:".73rem",borderRadius:8,width:"auto",fontWeight:700}}
                  onClick={()=>{
                    const updated={...item,status:"使用中"};
                    if(item._type==="fert") setFertMs(fertMs.map((x,i)=>i===item._idx?updated:x),updated);
                    else if(item._type==="material") setEquips(equips.map((x,i)=>i===item._idx?updated:x),updated);
                    else setPestMs(pestMs.map((x,i)=>i===item._idx?updated:x),updated);
                    showToast("使用中に戻しました");
                  }}>
                  ↩ 使用中に戻す
                </button>}
              </div>
            </div>
          );
        })}
      </>}

      {/* ── 農具タブ ── */}
      {mainTab==="equip"&&<>
        <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
          <div style={{flex:1,fontSize:".72rem",color:TX3}}>農機具・設備の管理</div>
          <button style={{...S.btn,background:"#ede9fe",color:"#5b21b6",border:"1px solid #c4b5fd",borderRadius:999,padding:"6px 12px",fontSize:".75rem",fontWeight:700,width:"auto"}}
            onClick={()=>setMItem({...newEquip,_idx:undefined})}>＋ 農具・設備</button>
        </div>
        <SearchBox value={equipQ} onChange={setEquipQ} placeholder="🔍 名前・種類・状態・メモで検索"/>
        {equipsOnly.length===0&&<div style={{color:TX3,fontSize:".82rem",padding:20,textAlign:"center"}}>農機具・設備がまだ登録されていません</div>}
        {equipsOnly.length>0&&equipsShown.length===0&&<div style={{color:TX3,fontSize:".82rem",padding:20,textAlign:"center"}}>「{equipQ}」に合う農具はありません</div>}
        {equipsShown.map((item)=>{
          const realIdx = equips.indexOf(item);
          const statusColor=item.status==="廃棄"?"#ef4444":item.status==="メンテナンス中"?"#f97316":item.status==="保管中"?"#6b7280":"#22c55e";
          return (
            <div key={item.id||realIdx} style={{...S.card,borderLeft:"4px solid #a78bfa"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <span style={{fontSize:"1.5rem",lineHeight:1.2}}>🔧</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:".9rem"}}>{item.name}</span>
                    <span style={{fontSize:".62rem",fontWeight:700,padding:"1px 6px",borderRadius:999,background:"#ede9fe",color:"#5b21b6"}}>{item.cat||"その他"}</span>
                    <span style={{fontSize:".62rem",fontWeight:700,padding:"1px 6px",borderRadius:999,background:statusColor+"22",color:statusColor}}>{item.status||"使用中"}</span>
                  </div>
                  <div style={{marginTop:5,display:"flex",gap:8,flexWrap:"wrap",fontSize:".72rem",color:TX3}}>
                    {item.price&&<span>💴 {parseFloat(item.price).toLocaleString()}円</span>}
                    {item.date&&<span>📅 {fmtYMD(item.date)}</span>}
                    {item.depYears&&<span>📉 {item.depYears}年償却</span>}
                    {item.note&&<span>{item.note}</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginTop:9,flexWrap:"wrap"}}>
                <button style={{...S.btn,background:G,color:"#fff",padding:"5px 10px",fontSize:".73rem",borderRadius:8,width:"auto",fontWeight:700}}
                  onClick={()=>setMBuy({...item,_item:item,_type:"equip",_idx:realIdx,cnt:"1",amt:item.price||"",date:todayStr(),note:""})}>
                  🛒 費用を記録
                </button>
                <button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>setMItem({...item,_type:"equip",_idx:realIdx})}>編集</button>
                <button style={{...S.btn,background:"#f0fdf4",color:"#2d6a3f",border:"1px solid #bbf7d0",borderRadius:8,padding:"4px 8px",fontSize:".68rem",width:"auto",cursor:"pointer",fontFamily:"inherit"}}
                  onClick={()=>{
                    if(!window.confirm(`「${item.name}」を在庫（消耗資材）管理に移動しますか？\nカテゴリを「消耗品」に変更します。`)) return;
                    const upd={...item,cat:"消耗品",stock:item.stock||"0",sunit:item.sunit||"個",cunit:item.cunit||"個",capacity:item.capacity||"",_type:"equip",_idx:realIdx};
                    const newArr=equips.map((x,i)=>i===realIdx?{...upd}:x);
                    setEquips(newArr,upd);
                    showToast(`「${item.name}」を消耗資材に移動しました`);
                  }}>📦 在庫へ移動</button>
                <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>deleteItem({...item,_type:"equip",_idx:realIdx})}>削除</button>
              </div>
            </div>
          );
        })}
        {/* 農具登録モーダル */}
        <ModalWithSave open={!!mItem&&mItem._type==="equip"} onClose={()=>setMItem(null)} title={mItem?._idx!==undefined?"農具・設備を編集":"農具・設備を登録"} onSave={saveItem}>
          {mItem&&mItem._type==="equip"&&<>
            <FG label="名称"><Inp value={mItem.name||""} onChange={v=>setMItem({...mItem,name:v})} placeholder="例：管理機 クボタ"/></FG>
            <R2>
              <FG label="カテゴリ"><Sel value={mItem.cat||"手工具（鍬・スコップ等）"} onChange={v=>setMItem({...mItem,cat:v})}
                options={EQUIP_CATS.map(v=>({value:v,label:v}))}/></FG>
              <FG label="状態"><Sel value={mItem.status||"使用中"} onChange={v=>setMItem({...mItem,status:v})}
                options={["使用中","保管中","メンテナンス中","廃棄"].map(v=>({value:v,label:v}))}/></FG>
            </R2>
            <R2>
              <FG label="購入価格（円）"><CalcInp value={mItem.price||""} onChange={v=>setMItem({...mItem,price:v})} placeholder="例：50000"/></FG>
              <FG label="購入日"><Inp type="date" value={mItem.date||todayStr()} onChange={v=>setMItem({...mItem,date:v})}/></FG>
            </R2>
            <FG label="減価償却年数">
              <Sel value={mItem.depYears||""} onChange={v=>setMItem({...mItem,depYears:v})}
                options={[{value:"",label:"償却しない（購入時に全額計上）"},...[2,3,4,5,6,7,8,10,15,17,22].map(n=>({value:String(n),label:n+"年で償却"}))]}/>
              <div style={{fontSize:".65rem",color:"#9ca3af",marginTop:3}}>
                手工具：3〜5年 / 農機具・動力機械：5〜10年 / ハウス・設備：15〜20年
              </div>
            </FG>
            <FG label="メモ"><Inp value={mItem.note||""} onChange={v=>setMItem({...mItem,note:v})} placeholder="購入先・シリアル番号など"/></FG>
          </>}
        </ModalWithSave>
        {/* 農具費用記録モーダル */}
        <ModalWithSave open={!!mBuy&&mBuy._type==="equip"} onClose={()=>setMBuy(null)} title={"🛒 "+(mBuy?.name||"")+" の費用"} onSave={saveBuy}>
          {mBuy&&mBuy._type==="equip"&&<>
            {/* 修正6: 単価×個数＝合計金額 */}
            <R2>
              <FG label="単価（円）">
                <CalcInp value={mBuy.unitPrice||""} onChange={v=>{
                  const up=parseFloat(v)||0;
                  const cnt=parseFloat(mBuy.cnt)||0;
                  const autoAmt=up>0&&cnt>0?String(Math.round(up*cnt)):(mBuy.amt||"");
                  setMBuy({...mBuy,unitPrice:v,amt:autoAmt});
                }} placeholder="例：50000"/>
              </FG>
              <FG label="個数・回数">
                <CalcInp value={mBuy.cnt||""} onChange={v=>{
                  const cnt=parseFloat(v)||0;
                  const up=parseFloat(mBuy.unitPrice)||0;
                  const autoAmt=up>0&&cnt>0?String(Math.round(up*cnt)):"";
                  setMBuy({...mBuy,cnt:v,amt:autoAmt});
                }} placeholder="0"/>
              </FG>
            </R2>
            {(parseFloat(mBuy.unitPrice)>0&&parseFloat(mBuy.cnt)>0)&&(
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"7px 12px",marginBottom:8,fontSize:".82rem",color:"#166534",fontWeight:700}}>
                合計: {(Math.round((parseFloat(mBuy.unitPrice)||0)*(parseFloat(mBuy.cnt)||0))).toLocaleString()}円
              </div>
            )}
            <R2>
              <FG label="合計金額（円）">
                <CalcInp value={mBuy.amt||""} onChange={v=>setMBuy({...mBuy,amt:v})} placeholder="例：50000"/>
              </FG>
              <FG label="日付"><Inp type="date" value={mBuy.date||todayStr()} onChange={v=>setMBuy({...mBuy,date:v})}/></FG>
            </R2>
            <FG label="メモ"><Inp value={mBuy.note||""} onChange={v=>setMBuy({...mBuy,note:v})} placeholder="例：燃料代・修理費"/></FG>
          </>}
        </ModalWithSave>
      </>}

      {/* 入力/編集モーダル */}
      <ModalWithSave open={!!mCost} title={mCost?.id?(isIncome(mCost.cat)?"収入を編集":"費用を編集"):(isIncome(mCost?.cat)?"収入を追加":"費用を追加")}
        onSave={sv} onClose={()=>setMCost(null)}>
        {mCost&&<>
          {/* 費用／収入 切り替え */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[["expense","💰 費用"],["income","💵 収入"]].map(([v,l])=>(
              <button key={v} onClick={()=>setMCost({...mCost,cat:v==="income"?"inc_crop":"seed"})}
                style={{flex:1,padding:"6px 0",border:"2px solid",
                  borderColor:(isIncome(mCost.cat)===(v==="income"))?"#2D6A3F":"#e0d9ce",
                  background:isIncome(mCost.cat)===(v==="income")?"#E8F5E9":"#fff",
                  color:isIncome(mCost.cat)===(v==="income")?"#1B5E20":"#888",
                  borderRadius:8,fontWeight:isIncome(mCost.cat)===(v==="income")?700:400,
                  cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>{l}</button>
            ))}
          </div>
          {/* 費目ボタングリッド */}
          <FG label="費目">
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {(isIncome(mCost.cat)?INCOME_CATS:COST_CATS).map(cat=>(
                <button key={cat.value} onClick={()=>setMCost({...mCost,cat:cat.value,
                  masterId:"",_newItem:false,_newName:"",_newType:"",_newCapacity:"",_newCunit:"",_newPrice:"",_newNpk:"",_newTarget:"",
                  _editMaster:false,_editName:undefined,_editType:undefined,_editCapacity:undefined,_editCunit:undefined,_editPrice:undefined,_editNpk:undefined,_editTarget:undefined,
                  _buyQty:"",_buyUnitPrice:""})}
                  style={{padding:"5px 9px",border:"1.5px solid",borderRadius:20,fontSize:".72rem",cursor:"pointer",fontFamily:"inherit",fontWeight:mCost.cat===cat.value?700:400,
                    borderColor:mCost.cat===cat.value?(isIncome(cat.value)?"#2D6A3F":"#5c3d1e"):"#ddd",
                    background:mCost.cat===cat.value?(isIncome(cat.value)?"#E8F5E9":"#f5f0e8"):"#fff",
                    color:mCost.cat===cat.value?(isIncome(cat.value)?"#1B5E20":"#5c3d1e"):"#666"}}>
                  {cat.label}
                </button>
              ))}
            </div>
          </FG>
          <FG label="金額（円）">
            <CalcInp value={mCost.amt} onChange={v=>setMCost({...mCost,amt:v})} placeholder="例：5000"/>
          </FG>
          {/* 割引・ポイント */}
          {!isIncome(mCost.cat)&&<>
            <FG label="割引・ポイント利用（円）">
              <CalcInp value={mCost.discount||""} onChange={v=>setMCost({...mCost,discount:v})} placeholder="例：500（なければ空欄）"/>
            </FG>
            {(parseFloat(mCost.discount)>0)&&<div style={{fontSize:".78rem",background:"#FFF8E1",border:"1px solid #FFE082",borderRadius:8,padding:"6px 10px",marginBottom:6,color:"#5c3d1e"}}>
              💡 実質支払：{(Math.max(0,(parseFloat(mCost.amt)||0)-(parseFloat(mCost.discount)||0))).toLocaleString()}円
              　（{parseFloat(mCost.discount).toLocaleString()}円 割引）
            </div>}
          </>}
          <FG label="内容・品名"><Inp value={mCost.name||""} onChange={v=>setMCost({...mCost,name:v})} placeholder="例：トマト苗/肥料/農産物売上"/></FG>
          {/* 肥料費・農薬費：購入記録＋在庫連動 (v2.0.9 強化) */}
          {(mCost.cat==="fert"||mCost.cat==="pest")&&(()=>{
            const msList = mCost.cat==="fert" ? fertMs : pestMs;
            const costCatLabel = mCost.cat==="fert" ? "肥料" : "農薬";
            // 過去の購入履歴（masterId付きのもの）
            const pastBuys = costs.filter(c=>c.cat===mCost.cat&&c.masterId&&!c.cancelled);
            // 重複排除（masterId毎に最新を1件）
            const latestByMaster = {};
            pastBuys.forEach(c=>{
              if(!latestByMaster[c.masterId]||c.date>latestByMaster[c.masterId].date) latestByMaster[c.masterId]=c;
            });
            const historyItems = Object.values(latestByMaster);
            // 検索フィルタ
            const histSrch = mCost._histSrch||"";
            const filteredHistory = histSrch
              ? historyItems.filter(c=>(c.name||"").includes(histSrch))
              : historyItems;
            const selectedMaster = mCost.masterId ? msList.find(m=>m.id===mCost.masterId) : null;
            const autoTotal = selectedMaster&&mCost._buyQty&&mCost._buyUnitPrice
              ? String(Math.round(parseFloat(mCost._buyQty)*parseFloat(mCost._buyUnitPrice)))
              : "";
            const addStockAmt = selectedMaster&&mCost._buyQty&&parseFloat(selectedMaster.capacity)>0
              ? parseFloat(mCost._buyQty)*parseFloat(selectedMaster.capacity)
              : null;
            const isBuyOpen = mCost._buyOpen !== false; // デフォルトで開く
            // 既存の購入記録を編集中のとき：「また買う」の履歴をうっかり押して別の資材に付け替えないよう、ふだんは隠す
            const origCostRec = mCost.id ? costs.find(x=>x.id===mCost.id) : null;
            const editingLinked = !!(origCostRec && origCostRec.masterId);
            const origMasterName = editingLinked ? ((msList.find(m=>m.id===origCostRec.masterId)||{}).name||origCostRec.name) : "";
            const askRelink = (newMs) => !editingLinked || newMs.id===origCostRec.masterId || window.confirm("この購入記録の資材を「"+origMasterName+"」から「"+newMs.name+"」に付け替えますか？\n（在庫も付け替わります。保存するまで確定しません）");
            return <>
              <div style={{background:"#f0faf0",border:"1px solid #b2dfdb",borderRadius:10,padding:"10px 12px",marginBottom:9}}>
                <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:isBuyOpen?8:0}}
                  onClick={()=>setMCost({...mCost,_buyOpen:!isBuyOpen})}>
                  <span style={{fontSize:".78rem",fontWeight:700,color:"#2d6a3f"}}>📦 購入を記録する（在庫に加算）</span>
                  <span style={{marginLeft:"auto",fontSize:".8rem",color:"#888"}}>{isBuyOpen?"▲":"▼"}</span>
                </div>
                {isBuyOpen&&<>
                  {/* 過去の購入履歴（Amazonの「また買う」）*/}
                  {editingLinked&&<div style={{fontSize:".72rem",color:"#7c5800",background:"#fff9e6",border:"1px solid #f0c040",borderRadius:8,padding:"6px 10px",marginBottom:8,lineHeight:1.6}}>
                    この記録は「<b>{origMasterName}</b>」の購入です。
                    <button onClick={()=>setMCost({...mCost,_showRelink:!mCost._showRelink})} style={{marginLeft:6,fontSize:".68rem",background:"none",border:"1px solid #c9a227",borderRadius:6,padding:"1px 8px",cursor:"pointer",color:"#7c5800"}}>{mCost._showRelink?"閉じる":"別の資材に付け替える"}</button>
                  </div>}
                  {historyItems.length>0&&(!editingLinked||mCost._showRelink)&&<>
                    <div style={{fontSize:".73rem",fontWeight:700,color:"#2d6a3f",marginBottom:4}}>{editingLinked?"⚠️ 別の資材に付け替える":"🔄 また買う（過去の"+costCatLabel+"購入）"}</div>
                    <Inp value={histSrch} onChange={v=>setMCost({...mCost,_histSrch:v})} placeholder={costCatLabel+"名で検索..."} style={{marginBottom:6}}/>
                    <div style={{maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
                      {filteredHistory.slice(0,10).map(c=>{
                        const ms = msList.find(m=>m.id===c.masterId);
                        return <div key={c.id}
                          onClick={()=>{
                            if(ms){
                              if(!askRelink(ms)) return;
                              const autoAmt=ms.price&&mCost._buyQty?String(Math.round(parseFloat(ms.price)*parseFloat(mCost._buyQty))):ms.price||"";
                              setMCost({...mCost,masterId:ms.id,name:ms.name,_buyUnitPrice:ms.price||"",_buyQty:mCost._buyQty||"1",amt:autoAmt||mCost.amt,_histSrch:"",_buyOpen:true});
                            }
                          }}
                          style={{cursor:"pointer",background:mCost.masterId===c.masterId?"#d1fae5":"#fff",border:"1px solid "+(mCost.masterId===c.masterId?"#6ee7b7":"#e0d9ce"),borderRadius:8,padding:"6px 10px",fontSize:".73rem"}}>
                          <div style={{fontWeight:700,marginBottom:2}}>{ms?ms.name:c.name}</div>
                          <div style={{color:"#888",display:"flex",gap:8,flexWrap:"wrap"}}>
                            <span>前回: {c.date||"不明"}</span>
                            {ms&&ms.price&&<span>単価: {ms.price}円/個</span>}
                            {ms&&ms.stock!==undefined&&<span>在庫: {ms.stock||0}{ms.sunit||ms.cunit||""}</span>}
                          </div>
                        </div>;
                      })}
                    </div>
                  </>}
                  {/* 資材選択（既存 or 新規登録）*/}
                  {!mCost.masterId&&!mCost._newItem&&<>
                    <div style={{fontSize:".73rem",fontWeight:700,color:"#2d6a3f",marginBottom:4}}>
                      {historyItems.length>0?"または資材を選択・新規登録":"資材マスターから選択 or 新規登録"}
                    </div>
                    {msList.filter(m=>m.status!=="使い切り（非表示）").length>0&&<>
                      <Sel value={mCost.masterId||""} onChange={v=>{
                        const ms=msList.find(m=>m.id===v);
                        if(ms && !askRelink(ms)) return;
                        if(ms) setMCost({...mCost,masterId:ms.id,name:ms.name,_buyUnitPrice:ms.price||"",_buyQty:mCost._buyQty||"1",_buyOpen:true});
                        else setMCost({...mCost,masterId:"",_buyOpen:true});
                      }} options={[{value:"",label:"（既存の資材から選ぶ）"},...msList.filter(m=>m.status!=="使い切り（非表示）").map(m=>({value:m.id,label:m.name}))]}/>
                      <div style={{textAlign:"center",fontSize:".72rem",color:TX3,margin:"6px 0"}}>または</div>
                    </>}
                    <button
                      onClick={()=>{
                        const defaultNew = mCost.cat==="fert"
                          ? {_newItemType:"fert",_newName:"",_newType:"化成肥料",_newCapacity:"",_newCunit:"kg",_newPrice:"",_newNpk:""}
                          : {_newItemType:"pest",_newName:"",_newType:"殺虫剤",_newCapacity:"",_newCunit:"ml",_newPrice:"",_newTarget:""};
                        setMCost({...mCost,...defaultNew,_newItem:true,_buyOpen:true});
                      }}
                      style={{...S.btn,background:"#e8f5e9",color:"#2d6a3f",border:"1px solid #a5d6a7",borderRadius:8,width:"100%",padding:"8px 0",fontSize:".8rem",fontWeight:700}}>
                      ＋ 新しい{costCatLabel}を登録して購入
                    </button>
                  </>}
                  {/* 新規資材登録フォーム */}
                  {!mCost.masterId&&mCost._newItem&&<div style={{background:"#f0fff4",border:"1px solid #a5d6a7",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:".78rem",fontWeight:700,color:"#2d6a3f"}}>✨ 新しい{costCatLabel}を登録</span>
                      <button onClick={()=>setMCost({...mCost,_newItem:false,_newName:"",_newType:"",_newCapacity:"",_newCunit:"",_newPrice:""})}
                        style={{fontSize:".72rem",background:"none",border:"1px solid #ccc",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#888"}}>キャンセル</button>
                    </div>
                    <FG label={costCatLabel+"名（必須）"}>
                      <Inp value={mCost._newName||""} onChange={v=>setMCost({...mCost,_newName:v,name:v})} placeholder={"例："+(mCost.cat==="fert"?"スーパーリン酸":"スミチオン乳剤")}/>
                    </FG>
                    {mCost.cat==="fert"&&<>
                      <R2>
                        <FG label="肥料の種類"><Sel value={mCost._newType||"化成肥料"} onChange={v=>setMCost({...mCost,_newType:v})}
                          options={["化成肥料","有機肥料","液肥","緩効性肥料","石灰・土壌改良材","培養土・堆肥","その他"].map(v=>({value:v,label:v}))}/></FG>
                        <FG label="N-P-K"><Inp value={mCost._newNpk||""} onChange={v=>setMCost({...mCost,_newNpk:v})} placeholder="8-8-8"/></FG>
                      </R2>
                    </>}
                    {mCost.cat==="pest"&&<>
                      <R2>
                        <FG label="農薬の種類"><Sel value={mCost._newType||"殺虫剤"} onChange={v=>setMCost({...mCost,_newType:v})}
                          options={["殺虫剤","殺菌剤","除草剤","殺虫殺菌剤",HORMONE_TYPE,"その他"].map(v=>({value:v,label:v}))}/></FG>
                      </R2>
                      <FG label="対象作物・病害虫"><Inp value={mCost._newTarget||""} onChange={v=>setMCost({...mCost,_newTarget:v})} placeholder="例：アブラムシ"/></FG>
                    </>}
                    <R2>
                      <FG label="内容量（1個）">
                        <div style={{display:"flex",gap:4}}>
                          <CalcInp value={mCost._newCapacity||""} onChange={v=>setMCost({...mCost,_newCapacity:v})} placeholder="例：500" style={{flex:1}}/>
                          <Sel value={mCost._newCunit||"ml"} onChange={v=>setMCost({...mCost,_newCunit:v})}
                            options={["ml","L","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/>
                        </div>
                      </FG>
                      <FG label="単価（円/個）">
                        <CalcInp value={mCost._newPrice||""} onChange={v=>{
                          const qty=parseFloat(mCost._buyQty)||0;
                          const price=parseFloat(v)||0;
                          const autoAmt=price&&qty?String(Math.round(price*qty)):"";
                          setMCost({...mCost,_newPrice:v,_buyUnitPrice:v,amt:autoAmt||mCost.amt});
                        }} placeholder="例：2000"/>
                      </FG>
                    </R2>
                    <div style={{fontSize:".68rem",color:"#888",marginBottom:6}}>※ 購入個数・合計金額は下の欄に入力してください</div>
                    <R2>
                      <FG label="購入個数">
                        <CalcInp value={mCost._buyQty||""} onChange={v=>{
                          const price=parseFloat(mCost._newPrice||mCost._buyUnitPrice)||0;
                          const qty=parseFloat(v)||0;
                          const autoAmt=price&&qty?String(Math.round(price*qty)):"";
                          setMCost({...mCost,_buyQty:v,amt:autoAmt||mCost.amt});
                        }} placeholder="0"/>
                      </FG>
                      <FG label="合計金額（円）">
                        <CalcInp value={mCost.amt||""} onChange={v=>setMCost({...mCost,amt:v})} placeholder="自動計算"/>
                      </FG>
                    </R2>
                    {mCost._buyQty&&mCost._newCapacity&&<div style={{fontSize:".72rem",color:"#2d6a3f",background:"#e6f7ee",borderRadius:6,padding:"5px 8px",marginBottom:6}}>
                      ✅ 在庫に加算: +{Math.round((parseFloat(mCost._buyQty)||0)*(parseFloat(mCost._newCapacity)||0)*100)/100}{mCost._newCunit||""}
                    </div>}
                    <div style={{fontSize:".68rem",color:"#888"}}>💡 保存時に資材が新規登録され、在庫が加算されます</div>
                  </div>}
                  {/* 選択中資材の購入入力 */}
                  {selectedMaster&&<div style={{marginTop:8,borderTop:"1px dashed #b2dfdb",paddingTop:8}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontSize:".73rem",fontWeight:700,color:"#2d6a3f"}}>
                        ✅ {selectedMaster.name}
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setMCost({...mCost,_editMaster:!mCost._editMaster})}
                          style={{fontSize:".65rem",background:mCost._editMaster?"#fff9e6":"none",border:"1px solid "+(mCost._editMaster?"#f0c040":"#ccc"),borderRadius:6,padding:"2px 8px",cursor:"pointer",color:mCost._editMaster?"#7c5800":"#555"}}>
                          ✏️ 資材情報を編集
                        </button>
                        <button onClick={()=>{ if(editingLinked && !window.confirm("この購入記録は「"+origMasterName+"」の購入です。資材の選び直しをしますか？（保存するまで確定しません）")) return; setMCost({...mCost,masterId:"",_buyQty:"",_buyUnitPrice:"",_editMaster:false}); }}
                          style={{fontSize:".65rem",background:"none",border:"1px solid #ccc",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#888"}}>変更</button>
                      </div>
                    </div>
                    {/* 資材情報編集パネル */}
                    {mCost._editMaster&&<div style={{background:"#fffde7",border:"1px solid #f0c040",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                      <div style={{fontSize:".75rem",fontWeight:700,color:"#7c5800",marginBottom:8}}>✏️ {selectedMaster.name} の情報を編集</div>
                      <FG label={costCatLabel+"名"}>
                        <Inp value={mCost._editName!==undefined?mCost._editName:selectedMaster.name} onChange={v=>setMCost({...mCost,_editName:v,name:v})}/>
                      </FG>
                      {mCost.cat==="fert"&&<>
                        <R2>
                          <FG label="肥料の種類">
                            <Sel value={mCost._editType!==undefined?mCost._editType:selectedMaster.type||"化成肥料"} onChange={v=>setMCost({...mCost,_editType:v})}
                              options={["化成肥料","有機肥料","液肥","緩効性肥料","石灰・土壌改良材","培養土・堆肥","その他"].map(v=>({value:v,label:v}))}/>
                          </FG>
                          <FG label="N-P-K"><Inp value={mCost._editNpk!==undefined?mCost._editNpk:selectedMaster.npk||""} onChange={v=>setMCost({...mCost,_editNpk:v})} placeholder="8-8-8"/></FG>
                        </R2>
                      </>}
                      {mCost.cat==="pest"&&<>
                        <R2>
                          <FG label="農薬の種類">
                            <Sel value={mCost._editType!==undefined?mCost._editType:selectedMaster.type||"殺虫剤"} onChange={v=>setMCost({...mCost,_editType:v})}
                              options={["殺虫剤","殺菌剤","除草剤","殺虫殺菌剤",HORMONE_TYPE,"その他"].map(v=>({value:v,label:v}))}/>
                          </FG>
                          <FG label="対象作物・病害虫">
                            <Inp value={mCost._editTarget!==undefined?mCost._editTarget:selectedMaster.target||""} onChange={v=>setMCost({...mCost,_editTarget:v})} placeholder="例：アブラムシ"/>
                          </FG>
                        </R2>
                      </>}
                      <R2>
                        <FG label="内容量（1個）">
                          <div style={{display:"flex",gap:4}}>
                            <CalcInp value={mCost._editCapacity!==undefined?mCost._editCapacity:selectedMaster.capacity||""} onChange={v=>setMCost({...mCost,_editCapacity:v})} placeholder="例：500" style={{flex:1}}/>
                            <Sel value={mCost._editCunit!==undefined?mCost._editCunit:selectedMaster.cunit||"ml"} onChange={v=>setMCost({...mCost,_editCunit:v})}
                              options={["ml","L","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/>
                          </div>
                        </FG>
                        <FG label="単価（円/個）">
                          <CalcInp value={mCost._editPrice!==undefined?mCost._editPrice:selectedMaster.price||""} onChange={v=>setMCost({...mCost,_editPrice:v})} placeholder="例：2000"/>
                        </FG>
                      </R2>
                      <div style={{fontSize:".68rem",color:"#888"}}>💡 保存時に資材マスターの情報も更新されます</div>
                    </div>}
                    <div style={{fontSize:".72rem",color:"#555",marginBottom:6}}>
                      現在在庫: <b>{selectedMaster.stock||0}{selectedMaster.sunit||selectedMaster.cunit||""}</b>
                      {selectedMaster.capacity&&<span> ／ 内容量: {selectedMaster.capacity}{selectedMaster.cunit}/個</span>}
                    </div>
                    <R2>
                      <FG label="購入個数">
                        <CalcInp value={mCost._buyQty||""} onChange={v=>{
                          const price=parseFloat(mCost._buyUnitPrice||selectedMaster.price)||0;
                          const qty=parseFloat(v)||0;
                          const autoAmt=price&&qty?String(Math.round(price*qty)):"";
                          setMCost({...mCost,_buyQty:v,amt:autoAmt||mCost.amt});
                        }} placeholder="0"/>
                      </FG>
                      <FG label="単価（円/個）">
                        <CalcInp value={mCost._buyUnitPrice||selectedMaster.price||""} onChange={v=>{
                          const qty=parseFloat(mCost._buyQty)||0;
                          const price=parseFloat(v)||0;
                          const autoAmt=price&&qty?String(Math.round(price*qty)):"";
                          setMCost({...mCost,_buyUnitPrice:v,amt:autoAmt||mCost.amt});
                        }} placeholder={selectedMaster.price||"例：1500"}/>
                      </FG>
                    </R2>
                    {(()=>{
                      const bq=parseFloat(mCost._buyQty)||0;
                      const cap=parseFloat(mCost._editMaster&&mCost._editCapacity!==undefined?mCost._editCapacity:selectedMaster.capacity)||0;
                      const addAmt=cap>0?bq*cap:bq;
                      const addUnit=(mCost._editMaster&&mCost._editCunit!==undefined?mCost._editCunit:selectedMaster.cunit||selectedMaster.sunit)||"";
                      const orig=mCost.id?costs.find(x=>x.id===mCost.id):null;
                      const prevAmt=(orig&&orig.masterId===selectedMaster.id&&!orig.cancelled)?costStockAmt(orig):0;
                      const delta=Math.round((addAmt-prevAmt)*100)/100;
                      if(!bq&&!prevAmt) return null;
                      return <div style={{fontSize:".72rem",color:delta<0?"#b45309":"#2d6a3f",background:delta<0?"#fef3c7":"#e6f7ee",borderRadius:6,padding:"5px 8px",marginBottom:6}}>
                        {prevAmt>0
                          ? (delta===0 ? <>✅ 在庫は変わりません（この購入で加算済み：{Math.round(prevAmt*100)/100}{addUnit}）</>
                                       : <>✅ 保存すると在庫を {delta>0?"+":""}{delta}{cap>0?addUnit:"個"} 調整（加算済み {Math.round(prevAmt*100)/100} → {Math.round(addAmt*100)/100}）</>)
                          : <>✅ 在庫に加算: +{Math.round(addAmt*100)/100}{cap>0?addUnit:"個"}</>}
                        {!cap&&bq>0&&<span style={{color:"#888"}}>（内容量未設定のため個数で加算）</span>}
                      </div>;
                    })()}
                    <div style={{fontSize:".68rem",color:"#888"}}>💡 購入個数×内容量が在庫に反映されます。あとで個数を直すと差分だけ調整します</div>
                  </div>}
                </>}
              </div>
            </>;
          })()}
          <R2>
            <FG label="日付"><Inp type="date" value={mCost.date||todayStr()} onChange={v=>{
              const cd=cards.find(c=>c.name===mCost.payMethod);
              const pd=cd&&calcPayDate?calcPayDate(v,cd):"";
              setMCost({...mCost,date:v,payDate:pd||mCost.payDate||""});
            }}/></FG>
            <FG label="品目（任意）">
              <Sel value={mCost.cropId||""} onChange={v=>setMCost({...mCost,cropId:v})}
                options={makeCropOptions(crops.filter(c=>!c.ended),"共通（品目割当なし）")}/>
            </FG>
          </R2>
          {!isIncome(mCost.cat)&&<>
            <FG label="支払方法">
              <Sel value={mCost.payMethod||"現金"} onChange={v=>{
                const cd=cards.find(c=>c.name===v);
                const pd=cd?calcPayDate&&calcPayDate(mCost.date,cd):"";
                setMCost({...mCost,payMethod:v,payDate:pd||""});
              }} options={[{value:"現金",label:"💴 現金"},{value:"振込",label:"🏦 銀行振込"},...(emoney||[]).map(e=>({value:e.name,label:"📱 "+e.name})),...(cards||[]).map(c=>({value:c.name,label:"💳 "+c.name}))]}/>
            </FG>
            {(mCost.payMethod&&(cards||[]).some(c=>c.name===mCost.payMethod))&&<>
              <FG label="引き落とし予定日">
                <Inp type="date" value={mCost.payDate||""} onChange={v=>setMCost({...mCost,payDate:v})}/>
              </FG>
              {mCost.payDate&&<div style={{fontSize:".72rem",color:"#1565C0",background:"#E3F2FD",borderRadius:8,padding:"6px 10px",marginBottom:6}}>
                💳 {mCost.payMethod}　引き落とし予定：{mCost.payDate}
              </div>}
            </>}
          </>}
          {!isIncome(mCost.cat)&&(()=>{
            const rate = mCost.apportionRate!==undefined ? Number(mCost.apportionRate) : (mCost.id && getApportionRates()[mCost.id]!==undefined ? Number(getApportionRates()[mCost.id]) : 100);
            const netAmt = Math.max(0,(parseFloat(mCost.amt)||0)-(parseFloat(mCost.discount)||0));
            return <FG label="家事按分（農業割合）">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="range" min={0} max={100} step={5}
                  value={rate}
                  onChange={e=>setMCost({...mCost,apportionRate:Number(e.target.value)})}
                  style={{flex:1}}/>
                <span style={{minWidth:36,textAlign:"right",fontWeight:700,color:rate<100?"#e07020":G}}>{rate}%</span>
              </div>
              <div style={{fontSize:".7rem",color:TX3,marginTop:2}}>
                {rate===100
                  ? "100%＝全額農業費用として計上"
                  : `農業${rate}%・家事${100-rate}%で按分。農業費用：${Math.round(netAmt*rate/100).toLocaleString()}円`}
              </div>
            </FG>;
          })()}
          {/* 売掛（未収）フラグ */}
          {isIncome(mCost.cat)&&<FG label="売掛・未収金">
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:".85rem",cursor:"pointer"}}>
              <input type="checkbox" checked={!!mCost.isReceivable} onChange={e=>setMCost({...mCost,isReceivable:e.target.checked,receivableDate:e.target.checked?mCost.receivableDate||"":""})} style={{accentColor:"#2D6A3F",width:16,height:16}}/>
              <span>売掛（未収）として記録する</span>
            </label>
            {mCost.isReceivable&&<div style={{marginTop:6}}>
              <div style={{fontSize:".72rem",color:"#5c3d1e",marginBottom:3}}>入金予定日</div>
              <Inp type="date" value={mCost.receivableDate||""} onChange={v=>setMCost({...mCost,receivableDate:v})}/>
            </div>}
          </FG>}
          {/* 農具・農機具費：既存から選ぶ or 新規登録 */}
          {(mCost.cat==="equip"||mCost.cat==="machine")&&(()=>{
            const equipLabel = mCost.cat==="machine" ? "農機具" : "農具・農機具";
            const equipList = (equips||[]).filter(e=>!MATERIAL_CATS.includes(e.cat));
            const isBuyOpen = mCost._buyOpen !== false;
            return <div style={{background:"#f5f0e8",border:"1px solid #d4a96a",borderRadius:10,padding:"10px 12px",marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:".78rem",fontWeight:700,color:"#5c3d1e"}}>🚜 {equipLabel}を登録</div>
                <button style={{background:"none",border:"none",fontSize:".72rem",color:TX3,cursor:"pointer"}}
                  onClick={()=>setMCost({...mCost,_buyOpen:!isBuyOpen})}>{isBuyOpen?"▲ 閉じる":"▼ 開く"}</button>
              </div>
              {isBuyOpen&&<>
                {/* 既存農機具から選択 */}
                {!mCost.masterId&&!mCost._newItem&&<>
                  {equipList.length>0&&<>
                    <div style={{fontSize:".72rem",color:TX3,marginBottom:4}}>既存の農機具と紐付ける</div>
                    <Sel value={""} onChange={v=>{
                      if(!v) return;
                      const eq=equips.find(e=>e.id===v);
                      setMCost({...mCost,masterId:v,depYears:eq?String(eq.depYears||""):"",name:mCost.name||(eq?.name||"")});
                    }} options={[{value:"",label:"（既存から選択）"},...equipList.map(e=>({value:e.id,label:e.name}))]}/>
                  </>}
                  <button onClick={()=>{
                    setMCost({...mCost,_newItem:true,_newType:EQUIP_CATS[0],_newName:"",_buyOpen:true});
                  }} style={{...S.btn,background:"#f0e8d0",color:"#5c3d1e",border:"1px solid #c8a84b",marginTop:6,fontSize:".78rem",width:"100%"}}>
                    ＋ 新しい{equipLabel}を登録して購入
                  </button>
                </>}
                {/* 既存農機具選択済み */}
                {mCost.masterId&&(()=>{
                  const selEq = equips.find(e=>e.id===mCost.masterId);
                  return <>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontSize:".76rem",color:"#5c3d1e",fontWeight:700}}>✅ {selEq?.name||"農機具"} を選択中</div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setMCost({...mCost,_editMaster:!mCost._editMaster})}
                          style={{fontSize:".65rem",background:mCost._editMaster?"#fff9e6":"none",border:"1px solid "+(mCost._editMaster?"#f0c040":"#ccc"),borderRadius:6,padding:"2px 8px",cursor:"pointer",color:mCost._editMaster?"#7c5800":"#555"}}>
                          ✏️ 情報を編集
                        </button>
                        <button onClick={()=>setMCost({...mCost,masterId:"",depYears:"",_editMaster:false})}
                          style={{fontSize:".65rem",background:"none",border:"1px solid #ccc",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#888"}}>×解除</button>
                      </div>
                    </div>
                    {mCost._editMaster&&selEq&&<div style={{background:"#fffde7",border:"1px solid #f0c040",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                      <div style={{fontSize:".75rem",fontWeight:700,color:"#7c5800",marginBottom:8}}>✏️ {selEq.name} の情報を編集</div>
                      <FG label={equipLabel+"名"}>
                        <Inp value={mCost._editName!==undefined?mCost._editName:selEq.name} onChange={v=>setMCost({...mCost,_editName:v,name:v})}/>
                      </FG>
                      <FG label="カテゴリ">
                        <Sel value={mCost._editType!==undefined?mCost._editType:selEq.cat||EQUIP_CATS[0]} onChange={v=>setMCost({...mCost,_editType:v})}
                          options={EQUIP_CATS.map(v=>({value:v,label:v}))}/>
                      </FG>
                      <div style={{fontSize:".68rem",color:"#888",marginTop:4}}>💡 保存時に農機具管理画面の情報も更新されます</div>
                    </div>}
                  </>;
                })()}
                {/* 新規農機具登録フォーム */}
                {!mCost.masterId&&mCost._newItem&&<div style={{background:"#fdf6e8",border:"1px solid #c8a84b",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:".78rem",fontWeight:700,color:"#5c3d1e"}}>✨ 新しい{equipLabel}を登録</span>
                    <button onClick={()=>setMCost({...mCost,_newItem:false,_newName:"",_newType:""})}
                      style={{background:"none",border:"none",fontSize:".8rem",color:TX3,cursor:"pointer"}}>✕ キャンセル</button>
                  </div>
                  <FG label={equipLabel+"名（必須）"}>
                    <Inp value={mCost._newName||""} onChange={v=>setMCost({...mCost,_newName:v,name:v})} placeholder={"例：管理機・刈払機"}/>
                  </FG>
                  <FG label="カテゴリ">
                    <Sel value={mCost._newType||EQUIP_CATS[0]} onChange={v=>setMCost({...mCost,_newType:v})}
                      options={EQUIP_CATS.map(v=>({value:v,label:v}))}/>
                  </FG>
                  <FG label="耐用年数（年）">
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <CalcInp value={mCost.depYears||""} onChange={v=>setMCost({...mCost,depYears:v})} placeholder="空欄＝少額一括計上"/>
                      <span style={{fontSize:".72rem",color:TX3,whiteSpace:"nowrap"}}>年</span>
                    </div>
                  </FG>
                  <div style={{fontSize:".68rem",color:"#888",marginTop:4}}>💡 保存時に農機具管理画面にも自動登録されます</div>
                </div>}
                {/* 既存選択済み：耐用年数更新 */}
                {mCost.masterId&&<FG label="耐用年数（年）">
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <CalcInp value={mCost.depYears||""} onChange={v=>setMCost({...mCost,depYears:v})} placeholder="空欄＝少額一括計上"/>
                    <span style={{fontSize:".72rem",color:TX3,whiteSpace:"nowrap"}}>年（空欄で一括計上）</span>
                  </div>
                </FG>}
              </>}
            </div>;
          })()}
          <FG label="メモ"><Inp value={mCost.note||""} onChange={v=>setMCost({...mCost,note:v})} placeholder="購入先・領収書番号など"/></FG>
          {mCost.id&&<div style={{display:"flex",gap:6,marginTop:8}}>
            {!mCost.cancelled
              ? <button onClick={()=>{if(window.confirm("この取引を取り消しますか？（記録は残ります）")){const orig=costs.find(x=>x.id===mCost.id)||mCost;const updated={...orig,cancelled:true};setCosts(costs.map(x=>x.id===mCost.id?updated:x),updated);const amt=costStockAmt(orig);if(amt>0)adjustMasterStock(orig.masterId,-amt);setMCost(null);showToast(amt>0?"取り消しました（在庫から"+Math.round(amt*100)/100+"を戻しました）":"取り消しました");}}} style={{...S.btn,background:"#FFF3E0",color:"#E65100",border:"1px solid #FFCC80",flex:1}}>取消</button>
              : <button onClick={()=>{if(window.confirm("取り消しを復活させますか？")){const orig=costs.find(x=>x.id===mCost.id)||mCost;const updated={...orig,cancelled:false};setCosts(costs.map(x=>x.id===mCost.id?updated:x),updated);const amt=costStockAmt(orig);if(amt>0)adjustMasterStock(orig.masterId,amt);setMCost(null);showToast(amt>0?"復活しました（在庫に"+Math.round(amt*100)/100+"を再加算）":"復活しました");}}} style={{...S.btn,background:"#E8F5E9",color:"#2E7D32",border:"1px solid #A5D6A7",flex:1}}>復活</button>}
            <button onClick={()=>{if(window.confirm("削除しますか？")){const n=costs.filter(x=>x.id!==mCost.id);try{const r=getApportionRates();delete r[mCost.id];localStorage.setItem("apportionRates",JSON.stringify(r));}catch{}if(mCost.id){dbDelete("costs",mCost.id);}setCosts(n);const orig=costs.find(x=>x.id===mCost.id);const amt=orig&&!orig.cancelled?costStockAmt(orig):0;if(amt>0&&window.confirm("この購入で在庫に加算した分（"+Math.round(amt*100)/100+"）を在庫から戻しますか？"))adjustMasterStock(orig.masterId,-amt);setMCost(null);showToast("削除しました");}}} style={{...S.btn,...S.btnR,flex:1}}>削除</button>
          </div>}
        </>}
      </ModalWithSave>

      {/* 按分マスター編集モーダル */}
      <ModalWithSave open={!!mApportion} title={mApportion?.id?"按分マスターを編集":"按分マスターを追加"} onClose={()=>setMApportion(null)}
        onSave={()=>{
          if(!mApportion.name){showToast("名称を入力してください");return;}
          const list = mApportion.id
            ? apportionMasters.map(a=>a.id===mApportion.id?{...mApportion}:a)
            : [...apportionMasters,{...mApportion,id:uid0()}];
          setApportionMasters(list);
          setMApportion(null);
          showToast("保存しました");
        }}>
        {mApportion&&<>
          <FG label="名称"><Inp value={mApportion.name||""} onChange={v=>setMApportion({...mApportion,name:v})} placeholder="例：電気代"/></FG>
          <FG label="費用カテゴリ">
            <Sel value={mApportion.cat||""} onChange={v=>setMApportion({...mApportion,cat:v})}
              options={[{value:"",label:"（選択）"},...COST_CATS.filter(c=>!c.value.startsWith("inc_")).map(c=>({value:c.value,label:c.label}))]}/>
          </FG>
          <FG label="デフォルト農業割合（%）">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min={0} max={100} step={5}
                value={mApportion.defaultRate!==undefined?mApportion.defaultRate:50}
                onChange={e=>setMApportion({...mApportion,defaultRate:Number(e.target.value)})}
                style={{flex:1}}/>
              <span style={{minWidth:36,textAlign:"right",fontWeight:700,color:G}}>
                {mApportion.defaultRate!==undefined?mApportion.defaultRate:50}%
              </span>
            </div>
          </FG>
          {mApportion.id&&<button onClick={()=>{if(window.confirm("削除しますか？")){setApportionMasters(apportionMasters.filter(a=>a.id!==mApportion.id));setMApportion(null);showToast("削除しました");}}} style={{...S.btn,...S.btnR,marginTop:8}}>削除</button>}
        </>}
      </ModalWithSave>

      {/* クレジットカード編集モーダル */}
      <ModalWithSave open={!!mCard} title={mCard?._idx!==undefined?"カード情報を編集":"カード情報を追加"} onClose={()=>setMCard(null)}
        onSave={()=>{
          if(!mCard.name){showToast("カード名を入力してください");return;}
          let list;
          if(mCard._idx!==undefined){
            list = creditCards.map((c,i)=>i===mCard._idx?{...mCard,id:mCard.id||uid0()}:c);
          } else {
            list = [...creditCards,{...mCard,id:uid0()}];
          }
          setCreditCards(list);
          setMCard(null);
          showToast("保存しました");
        }}>
        {mCard&&<>
          <FG label="カード名"><Inp value={mCard.name||""} onChange={v=>setMCard({...mCard,name:v})} placeholder="例：イオンカード・JAカード"/></FG>
          <FG label="カード番号末4桁"><Inp value={mCard.number||""} onChange={v=>setMCard({...mCard,number:v.replace(/\D/g,"").slice(0,4)})} placeholder="1234" inputMode="numeric" maxLength={4}/></FG>
          <FG label="名義人（ローマ字）"><Inp value={mCard.holder||""} onChange={v=>setMCard({...mCard,holder:v})} placeholder="TARO YAMADA"/></FG>
          <FG label="有効期限（MM/YY）"><Inp value={mCard.expiry||""} onChange={v=>setMCard({...mCard,expiry:v})} placeholder="12/28"/></FG>
          <R2>
            <FG label="締め日（末日は31）"><Inp type="number" value={mCard.closingDay||""} onChange={v=>setMCard({...mCard,closingDay:v})} placeholder="15"/></FG>
            <FG label="引き落とし日（末日は31）"><Inp type="number" value={mCard.payDay||""} onChange={v=>setMCard({...mCard,payDay:v})} placeholder="10"/></FG>
          </R2>
          <R2>
            <FG label="翌月 or 翌々月払い">
              <Sel value={String(mCard.payNext||"1")} onChange={v=>setMCard({...mCard,payNext:v})}
                options={[{value:"1",label:"翌月払い"},{value:"2",label:"翌々月払い"}]}/>
            </FG>
            <FG label="休日の場合">
              <Sel value={mCard.holidayMode||"next"} onChange={v=>setMCard({...mCard,holidayMode:v})}
                options={[{value:"next",label:"翌営業日"},{value:"prev",label:"前営業日"},{value:"none",label:"そのまま"}]}/>
            </FG>
          </R2>
          <FG label="引き落とし口座"><Inp value={mCard.bank||""} onChange={v=>setMCard({...mCard,bank:v})} placeholder="例：JAバンク 普通口座"/></FG>
          <FG label="メモ"><Inp value={mCard.note||""} onChange={v=>setMCard({...mCard,note:v})} placeholder="ポイント・特典など"/></FG>
          {mCard._idx!==undefined&&<button onClick={()=>{if(window.confirm("削除しますか？")){setCreditCards(creditCards.filter((_,i)=>i!==mCard._idx));setMCard(null);showToast("削除しました");}}} style={{...S.btn,...S.btnR,marginTop:8}}>削除</button>}
        </>}
      </ModalWithSave>

      {/* 電子マネー編集モーダル */}
      <ModalWithSave open={!!mEmoney} title={mEmoney?._idx!==undefined?"電子マネーを編集":"電子マネーを追加"} onClose={()=>setMEmoney(null)}
        onSave={()=>{
          const nm=(mEmoney.name||"").trim();
          if(!nm){showToast("名前を入力してください");return;}
          if(nm==="現金"||nm==="振込"||(cards||[]).some(c=>c.name===nm)||(emoney||[]).some((e,i)=>e.name===nm&&i!==mEmoney._idx)){showToast("同じ名前の支払方法が既にあります");return;}
          const {_idx,...item}={...mEmoney,name:nm};
          const list = _idx!==undefined
            ? emoney.map((e,i)=>i===_idx?{...item,id:item.id||uid0()}:e)
            : [...(emoney||[]),{...item,id:uid0()}];
          setEmoney&&setEmoney(list);
          setMEmoney(null);
          showToast("保存しました");
        }}>
        {mEmoney&&<>
          <FG label="名前"><Inp value={mEmoney.name||""} onChange={v=>setMEmoney({...mEmoney,name:v})} placeholder="例：PayPay・メルペイ"/></FG>
          <FG label="チャージ元"><Inp value={mEmoney.source||""} onChange={v=>setMEmoney({...mEmoney,source:v})} placeholder="例：JAバンク 普通口座・現金"/></FG>
          <FG label="メモ"><Inp value={mEmoney.note||""} onChange={v=>setMEmoney({...mEmoney,note:v})} placeholder="ポイント還元など"/></FG>
          <div style={{fontSize:".7rem",color:TX3,background:"#f5f5f5",borderRadius:8,padding:"8px 10px",marginTop:4,lineHeight:1.6}}>
            📱 電子マネー払いは<b>支払日＝購入日</b>で計上されます（締め日・引き落としなし）。<br/>
            申告用の出納帳では「電子マネー」欄として現金・預金とは別に集計されます。<br/>
            ポイント払い分は費用の「割引・ポイント」欄で差し引いてください。
          </div>
          {mEmoney._idx!==undefined&&<button onClick={()=>{if(window.confirm("削除しますか？")){setEmoney&&setEmoney(emoney.filter((_,i)=>i!==mEmoney._idx));setMEmoney(null);showToast("削除しました");}}} style={{...S.btn,...S.btnR,marginTop:8}}>削除</button>}
        </>}
      </ModalWithSave>

      {/* 農薬記録書出力モーダル */}
      {showPestExportModal&&(()=>{
        const pestCropIds = [...new Set(logs.filter(l=>isPestWork(l.work)).map(l=>l.cropId).filter(Boolean))];
        const pestCrops = crops.filter(c=>pestCropIds.includes(c.id));
        const close = () => setShowPestExportModal(false);
        return (
          <div
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"env(safe-area-inset-top,16px) 16px 16px",overflowY:"auto"}}
            onClick={e=>{if(e.target===e.currentTarget)close();}}
            onKeyDown={e=>{if(e.key==="Escape")close();}}
            tabIndex={-1}
          >
            <div style={{background:"#fff",borderRadius:16,padding:"20px 18px 24px",width:"100%",maxWidth:400,boxShadow:"0 8px 40px rgba(0,0,0,.35)",marginTop:16,marginBottom:16}}>
              {/* ヘッダー */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:"1.05rem",color:G}}>🌿 農薬使用記録簿の出力</div>
                <button onClick={close} style={{background:"none",border:"none",fontSize:"1.2rem",color:TX3,cursor:"pointer",padding:4,lineHeight:1}}>✕</button>
              </div>

              {/* 固定設定（保存される） */}
              <div style={{background:"#f5f9f5",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                <div style={{fontSize:".72rem",color:G,fontWeight:700,marginBottom:8}}>📋 提出者情報（保存されます）</div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:".75rem",color:TX3,marginBottom:3}}>会員番号</div>
                  <input value={pestExportMemberNo} onChange={e=>setPestExportMemberNo(e.target.value)}
                    placeholder="例：FM-0123"
                    style={{...S.inp,width:"100%",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:".75rem",color:TX3,marginBottom:3}}>栽培者名</div>
                  <input value={pestExportGrowerName} onChange={e=>setPestExportGrowerName(e.target.value)}
                    placeholder="例：山田　太郎"
                    style={{...S.inp,width:"100%",boxSizing:"border-box"}}/>
                </div>
              </div>

              {/* 今回の出力設定 */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:".75rem",color:TX3,marginBottom:3}}>収穫開始予定日（任意）</div>
                <input type="date" value={pestExportHarvestDate} onChange={e=>setPestExportHarvestDate(e.target.value)}
                  style={{...S.inp,width:"100%",boxSizing:"border-box"}}/>
              </div>

              {/* 品目選択 */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:".75rem",color:TX3,marginBottom:6}}>出力する品目</div>
                {pestCrops.length===0
                  ? <div style={{color:"#c00",fontSize:".82rem",padding:"8px 0"}}>防除作業の記録がまだありません</div>
                  : <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto",paddingRight:4}}>
                      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:".88rem",cursor:"pointer",padding:"4px 0"}}>
                        <input type="radio" name="pestCrop" checked={pestExportCropId===""} onChange={()=>setPestExportCropId("")} style={{accentColor:G,flexShrink:0}}/>
                        <span>全品目（品目別シートで出力）</span>
                      </label>
                      {pestCrops.map(c=>(
                        <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:".88rem",cursor:"pointer",padding:"4px 0"}}>
                          <input type="radio" name="pestCrop" checked={pestExportCropId===c.id} onChange={()=>setPestExportCropId(c.id)} style={{accentColor:G,flexShrink:0}}/>
                          <span>{cropName(c.id)}</span>
                        </label>
                      ))}
                    </div>
                }
              </div>

              {pestCrops.length>0&&<button
                style={{...S.btn,background:G,color:"#fff",width:"100%",marginBottom:8,padding:"11px 0",fontSize:".92rem",fontWeight:700}}
                onClick={()=>{close();exportPestRecord(pestExportCropId||null);}}>
                📥 Excelで出力
              </button>}
              <button style={{...S.btn,background:"#f0ece4",color:TX3,width:"100%",padding:"10px 0"}} onClick={close}>キャンセル</button>
            </div>
          </div>
        );
      })()}

      {/* 申告確認タブ */}
      {mainTab==="ledger"&&(()=>{
        const LedgerRowInner = LedgerRow; const LedgerSecHdInner = LedgerSecHd;
        const Row = LedgerRowInner; const SecHd = LedgerSecHdInner;
        const yr = selYear;
        // 帳簿Excelと同じ計算（buildLedger）で表示
        const Lg = buildLedger(Number(yr), {costs, equips, cards, emoney});
        const kaigyoDate = Lg.KAIGYO_DATE;
        const kaigyoTotal = Lg.kaiTotal;
        const incTotal = Lg.incTotal;
        const expTotal0 = Lg.expTotal - Lg.equipDepTotal; // 按分後の経費（減価償却を除く）
        const invData = getInventory(yr);
        const invStart = Lg.invStart;
        const invEnd   = Lg.invEnd;
        const expTotal = Lg.totalExp;
        const profit = Lg.agriIncome;
        const thisYear = Number(yr)||new Date().getFullYear();
        const equipBookVal = Lg.equipBookValue;
        const motoire = Lg.motoire;
        const nextMotoire = Lg.nextMotoire;
        return (<>
          {/* 棚卸資産入力 */}
          <div style={S.card}>
            <SecHd label={"📦 棚卸資産（"+yr+"年）"}/>
            <div style={{fontSize:".72rem",color:TX3,marginBottom:8}}>期首・期末の在庫（種苗・肥料等）を入力すると損益計算に反映されます。期首は未入力なら前年の期末棚卸を自動で使います{Lg.invStartAuto&&Lg.invStart>0?"（今回："+Lg.invStart.toLocaleString()+"円）":""}。</div>
            <R2>
              <FG label="期首棚卸（円）">
                <input type="number" inputMode="numeric" value={invData.start||""} placeholder={Lg.invStartAuto&&Lg.invStart>0?Lg.invStart+"（前年の期末）":"例：50000"}
                  style={{...S.inp,width:"100%",boxSizing:"border-box"}}
                  onChange={e=>{const v=e.target.value;const obj={...getInventory(yr),start:v};setInventory(yr,obj);}}/>
              </FG>
              <FG label="期末棚卸（円）">
                <input type="number" inputMode="numeric" value={invData.end||""} placeholder="例：30000"
                  style={{...S.inp,width:"100%",boxSizing:"border-box"}}
                  onChange={e=>{const v=e.target.value;const obj={...getInventory(yr),end:v};setInventory(yr,obj);}}/>
              </FG>
            </R2>
            <button style={{...S.btn,background:"#e8f5e9",color:"#2d6a3f",border:"1px solid #b2dfdb",width:"100%",marginTop:8,padding:"8px 0",fontSize:".8rem",fontWeight:700,borderRadius:8}}
              onClick={()=>{
                const total = [...fertMs,...pestMs,...materialMs].filter(f=>f.status!=="使い切り（非表示）").reduce((sum,f)=>sum+stockValueOf(f),0);
                const obj={...getInventory(yr),end:String(total)};
                setInventory(yr,obj);
                showToast("在庫から期末棚卸を自動計算しました："+total.toLocaleString()+"円");
              }}>
              📦 在庫から期末棚卸を自動計算
            </button>
            <div style={{fontSize:".68rem",color:TX3,marginTop:4}}>※ 肥料・農薬・消耗資材の「在庫÷内容量×購入価格」で集計します（内容量か価格が未設定のものは0円・使い切り済みは除外。在庫タブの評価額と同じ）</div>
            {(invStart>0||invEnd>0)&&<div style={{fontSize:".78rem",color:G,background:G3,borderRadius:8,padding:"6px 10px",marginTop:6}}>
              費用への加算：{(invStart-invEnd>=0?"+":"")+Math.round(invStart-invEnd).toLocaleString()}円（期首{invStart.toLocaleString()} - 期末{invEnd.toLocaleString()}）
            </div>}
          </div>
          {/* 開業費セクション（開業日が設定されていて、開業費がある場合のみ表示） */}
          {kaigyoDate&&kaigyoTotal>0&&<div style={S.card}>
            <SecHd label={"🏪 開業費（"+kaigyoDate+"以前の支出）"}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontWeight:700,fontSize:".85rem",color:"#7c4d00"}}>開業費 合計</span>
              <span style={{fontWeight:700,fontSize:"1rem",color:"#7c4d00"}}>{kaigyoTotal.toLocaleString()}円</span>
            </div>
            <div style={{background:"#fff8e8",borderRadius:6,padding:"8px 10px",fontSize:".73rem",color:"#8a6000",lineHeight:1.7}}>
              💡 <b>青色申告での扱い</b>：繰延資産として5年以内に任意償却できます。<br/>
              確定申告書「繰延資産の償却費」欄に記入してください。<br/>
              <b>5年均等償却の目安</b>：年間 {Math.round(kaigyoTotal/5).toLocaleString()}円{Lg.kaiShokyaku>0&&<>（{yr}年分 {Lg.kaiShokyaku.toLocaleString()}円・損益に反映済み）</>}<br/>
              ※ 開業年は「開業月以降の月数 ÷ 12 × 年額」で月割り計算します。
            </div>
          </div>}

          <div style={S.card}>
            <SecHd label={"📊 損益計算書（"+yr+"年・開業後）"}/>
            {kaigyoDate&&<div style={{fontSize:".72rem",color:TX3,marginBottom:6}}>開業日（{kaigyoDate}）以降の収入・費用のみ集計しています。</div>}
            {Lg.preOpenInc.length>0&&<div style={{fontSize:".72rem",color:"#b45309",background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 10px",marginBottom:6,lineHeight:1.6}}>
              ⚠️ 開業日より前の収入が{Lg.preOpenInc.length}件（{Lg.preOpenInc.reduce((s,c)=>s+(Number(c.amt)||0),0).toLocaleString()}円）あり、集計に含まれていません。開業日が正しいか確認してください。
            </div>}
            {Lg.manualDepAmt>0&&Lg.equipDepTotal>0&&<div style={{fontSize:".72rem",color:"#b45309",background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 10px",marginBottom:6,lineHeight:1.6}}>
              ⚠️ 費用に手入力の「減価償却費」（{Lg.manualDepAmt.toLocaleString()}円）があり、農機具の自動計算（{Lg.equipDepTotal.toLocaleString()}円）と二重になっている可能性があります。どちらか一方にしてください。
            </div>}
            <Row label="農業収入合計" val={incTotal} bold/>
            <Row label="経費（家事按分後）" val={expTotal0} sub/>
            {Lg.equipDepTotal>0&&<Row label="＋減価償却費（農機具等）" val={Lg.equipDepTotal} sub/>}
            {Lg.kaiShokyaku>0&&<Row label="＋開業費償却" val={Lg.kaiShokyaku} sub/>}
            {(invStart>0||invEnd>0)&&<>
              <Row label="＋期首棚卸" val={invStart} sub/>
              <Row label="－期末棚卸" val={-invEnd} sub/>
            </>}
            <Row label="農業費用合計" val={expTotal}/>
            <Row label={profit>=0?"農業所得（利益）":"農業損失"} val={profit} bold/>
            {profit>0&&<>
              <Row label={"青色申告特別控除（"+(Lg.blueMax/10000)+"万円）"} val={-Lg.blueDeduction} sub/>
              <Row label="控除後の農業所得（概算）" val={Math.max(0,profit-Lg.blueDeduction)} bold/>
            </>}
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,flexWrap:"wrap"}}>
              <span style={{fontSize:".72rem",color:TX3}}>青色申告特別控除：</span>
              <select value={String(Lg.blueMax)} onChange={e=>{try{localStorage.setItem("sakumemo_blue_ded",e.target.value);}catch{} syncAppSettings(); setInvTick(t=>t+1);}}
                style={{...S.inp,width:"auto",padding:"4px 8px",fontSize:".78rem"}}>
                <option value="650000">65万円（e-Tax申告・電子帳簿保存）</option>
                <option value="550000">55万円（紙で提出）</option>
                <option value="100000">10万円（簡易簿記）</option>
              </select>
            </div>
          </div>
          <div style={S.card}>
            <SecHd label="📋 貸借対照表（簡易）"/>
            <div style={{fontSize:".76rem",color:TX3,marginBottom:6}}>資産の部</div>
            <Row label="農機具帳簿価額（自動計算）" val={equipBookVal} sub/>
            <div style={{fontSize:".76rem",color:TX3,margin:"8px 0 6px"}}>負債・資本の部</div>
            <Row label="元入金（期首）" val={motoire} sub/>
            <Row label="農業所得（当期）" val={profit} sub/>
            {Lg.jigyonushiKari>0&&<Row label="＋事業主借（個人資金・電子マネー払い等）" val={Lg.jigyonushiKari} sub/>}
            {Lg.jigyonushiKashi>0&&<Row label="－事業主貸（引出し・家事分）" val={-Lg.jigyonushiKashi} sub/>}
            <Row label="元入金（期末・来年への繰越）" val={nextMotoire} bold/>
            <div style={{marginTop:8}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button style={{...S.btn,...S.btnS}} onClick={()=>{
                  setOpeningMotoire(Number(yr)+1,nextMotoire);showToast((Number(yr)+1)+"年の期首元入金として保存しました（"+nextMotoire.toLocaleString()+"円）");
                }}>来年の元入金として保存</button>
                <button style={{...S.btn,background:"#f3f0ea",color:"#666",border:"1px solid #e0d9ce",borderRadius:8,padding:"7px 12px",fontSize:".8rem",cursor:"pointer",fontFamily:"inherit"}}
                  onClick={()=>{setMotoireEditOpen(p=>!p);setMotoireInput(String(motoire));}}>✏️ 手動で修正</button>
              </div>
              {motoireEditOpen&&(
                <div style={{marginTop:10,background:"#fef9f0",border:"1px solid #f0c060",borderRadius:8,padding:10}}>
                  <div style={{fontSize:".76rem",color:"#8a6000",marginBottom:6}}>⚠️ 元入金（期首）を手動で上書きします</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="text" inputMode="decimal" value={motoireInput}
                      onChange={e=>setMotoireInput(e.target.value.replace(/[^0-9\-]/g,""))}
                      placeholder="例：500000"
                      style={{...S.inp,flex:1,fontSize:".9rem"}}/>
                    <span style={{fontSize:".8rem",color:TX3}}>円</span>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button style={{...S.btn,...S.btnG,flex:1}} onClick={()=>{
                      const v=parseInt(motoireInput)||0;
                      setOpeningMotoire(yr,v);showToast(yr+"年の期首元入金を "+v.toLocaleString()+" 円に更新しました");
                      setMotoireEditOpen(false);
                    }}>この金額で保存</button>
                    <button style={{...S.btn,background:"#fee2e2",color:"#dc2626",borderRadius:8,padding:"7px 14px",border:"none",cursor:"pointer",flex:1,fontFamily:"inherit",fontSize:".8rem"}}
                      onClick={()=>{
                        if(window.confirm("元入金を0円にリセットしますか？")){
                          setOpeningMotoire(yr,0);showToast("元入金を0円にリセットしました");
                          setMotoireEditOpen(false);
                        }
                      }}>0円にリセット</button>
                  </div>
                  <button style={{...S.btn,background:"#eee",color:"#666",borderRadius:8,padding:"6px",border:"none",cursor:"pointer",width:"100%",marginTop:6,fontFamily:"inherit",fontSize:".78rem"}}
                    onClick={()=>setMotoireEditOpen(false)}>キャンセル</button>
                </div>
              )}
            </div>
          </div>
          {Lg.depRows.length>0&&<div style={S.card}>
            <SecHd label={"🚜 農機具等の減価償却（"+yr+"年）"}/>
            <div style={{fontSize:".72rem",color:TX3,marginBottom:8}}>耐用年数を設定した農機具を定額法（法定償却率・使い始めた年は月割り）で計算しています。帳簿Excelと同じ金額です。</div>
            {Lg.depRows.map((x,i)=>{
              const eq=x.eq, price=parseFloat(eq.price)||0, life=parseInt(eq.depYears)||0;
              return <div key={eq.id||i} style={{padding:"7px 0",borderBottom:"1px solid "+BD,fontSize:".78rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700}}>{eq.name||"農機具"}</span>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,color:INFO,fontSize:".82rem"}}>年末帳簿価額 {x.book.toLocaleString()}円</div>
                    <div style={{fontSize:".68rem",color:TX3}}>{yr}年の償却費 {x.annual.toLocaleString()}円</div>
                  </div>
                </div>
                <div style={{color:TX3,marginTop:2}}>取得価額 {price.toLocaleString()}円 · {String(eq.date).slice(0,10)}取得 · 耐用{life}年（償却率{depRateOf(life)}）</div>
              </div>;
            })}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",fontWeight:700,paddingTop:6}}>
              <span>合計</span><span>償却費 {Lg.equipDepTotal.toLocaleString()}円 / 帳簿価額 {Lg.equipBookValue.toLocaleString()}円</span>
            </div>
          </div>}
          {/* クレジットカード情報 */}
          <div style={S.card}>
            <SecHd label="💳 クレジットカード情報"/>
            <div style={{fontSize:".72rem",color:TX3,marginBottom:8}}>費用入力時の支払い方法・締め日・引き落とし日を管理します。</div>
            {creditCards.map((card,ci)=>(
              <div key={card.id||ci} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+BD}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".84rem",fontWeight:700}}>💳 {card.name||"カード"+(ci+1)}</div>
                  <div style={{fontSize:".7rem",color:TX3}}>
                    {[card.closingDay&&`締め${card.closingDay}日`, card.payDay&&`引落${card.payDay}日`, card.bank].filter(Boolean).join(" · ")||"詳細未登録"}
                  </div>
                </div>
                <button style={{...S.btn,...S.btnS,fontSize:".72rem",flexShrink:0,width:"auto",padding:"6px 14px"}} onClick={()=>setMCard({...card,_idx:ci})}>編集</button>
              </div>
            ))}
            <button style={{...S.btn,...S.btnG,marginTop:4}} onClick={()=>setMCard({name:"",number:"",holder:"",expiry:"",closingDay:"",payDay:"",bank:"",note:""})}>＋ カードを追加</button>
          </div>
          {/* 電子マネー情報 */}
          <div style={S.card}>
            <SecHd label="📱 電子マネー・QR決済"/>
            <div style={{fontSize:".72rem",color:TX3,marginBottom:8}}>PayPay・メルペイなどチャージして使う支払方法。締め日・引き落としはなく、購入日に支払済みとして扱います。</div>
            {(emoney||[]).map((em,ei)=>(
              <div key={em.id||ei} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+BD}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".84rem",fontWeight:700}}>📱 {em.name}</div>
                  <div style={{fontSize:".7rem",color:TX3}}>{[em.source&&`チャージ元：${em.source}`,em.note].filter(Boolean).join(" · ")||"詳細未登録"}</div>
                </div>
                <button style={{...S.btn,...S.btnS,fontSize:".72rem",flexShrink:0,width:"auto",padding:"6px 14px"}} onClick={()=>setMEmoney({...em,_idx:ei})}>編集</button>
              </div>
            ))}
            <button style={{...S.btn,...S.btnG,marginTop:4}} onClick={()=>setMEmoney({name:"",source:"",note:""})}>＋ 電子マネーを追加</button>
          </div>
        </>);
      })()}

      {/* 資金繰り表タブ */}
      {mainTab==="cashflow"&&(()=>{
        const today2 = new Date();
        const ymOf = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); // 端末の日付（日本時間）で月を決める
        // 過去6ヶ月〜今後3ヶ月
        const months9 = [];
        for(let i=-6;i<=2;i++) months9.push(ymOf(new Date(today2.getFullYear(), today2.getMonth()+i, 1)));
        // お金が実際に動く日：カード払いは引き落とし日、未収金は入金予定日（未設定なら除外）
        const isCardPM2 = pm => !!pm && !isEmoneyPM(pm) && (cards||[]).some(cd=>cd.name===pm);
        const flowsOf = c => {
          if(c.cancelled || String(c.cat||"").startsWith("__")) return null;
          if(isIncome(c.cat)){
            if(c.cat==="inc_owner_draw") return {date:c.date||"", inc:0, exp:Number(c.amt)||0};   // 事業主貸＝出金
            if(c.isReceivable) return c.receivableDate ? {date:c.receivableDate, inc:Number(c.amt)||0, exp:0} : null;
            return {date:c.date||"", inc:Number(c.amt)||0, exp:0};
          }
          if(c.cat==="owner_loan") return {date:c.date||"", inc:Number(c.amt)||0, exp:0};         // 事業主借＝入金
          return {date:(isCardPM2(c.payMethod) ? (c.payDate||c.date) : c.date)||"", inc:0, exp:Number(c.amt)||0};
        };
        const flows = costs.map(flowsOf).filter(f=>f&&f.date);
        // 表示開始月より前の入出金も累計に含める（記録上の残高）
        let cumulative = flows.filter(f=>f.date.slice(0,7) < months9[0]).reduce((s,f)=>s+f.inc-f.exp,0);
        const startBal = cumulative;
        const rows = months9.map(ym=>{
          const fm = flows.filter(f=>f.date.startsWith(ym));
          const inc = fm.reduce((s,f)=>s+f.inc,0);
          const exp = fm.reduce((s,f)=>s+f.exp,0);
          const diff = inc - exp;
          cumulative += diff;
          return {ym, inc, exp, diff, cumulative};
        });
        return (
          <div style={S.card}>
            <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".9rem",color:"#5c3d1e",marginBottom:4}}>📈 資金繰り表（月別キャッシュフロー）</div>
            <div style={{fontSize:".7rem",color:"#888",marginBottom:10,lineHeight:1.6}}>記録した入出金の累計（{months9[0].replace("-","/")}より前の分 {Math.round(startBal).toLocaleString()}円 を含む）。カード払いは引き落とし日、未収金は入金予定日で計上。事業主借は入金・事業主貸は出金。開業資金など記録していない残高は含みません。</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:".75rem"}}>
                <thead>
                  <tr style={{background:"#f0ebe3"}}>
                    {["月","収入","支出","差引","累計残高"].map(h=>(
                      <th key={h} style={{padding:"5px 6px",textAlign:"right",fontWeight:700,color:"#5c3d1e",borderBottom:"2px solid #ddd",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i)=>{
                    const isCur = r.ym===ymOf(today2);
                    return (
                      <tr key={r.ym} style={{background:isCur?"#fffde7":i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"5px 6px",fontWeight:isCur?700:400,whiteSpace:"nowrap"}}>{r.ym.slice(0,4)}/{r.ym.slice(5,7)}{isCur?" ★":""}</td>
                        <td style={{padding:"5px 6px",textAlign:"right",color:"#1B5E20"}}>{r.inc>0?r.inc.toLocaleString():"-"}</td>
                        <td style={{padding:"5px 6px",textAlign:"right",color:"#B71C1C"}}>{r.exp>0?r.exp.toLocaleString():"-"}</td>
                        <td style={{padding:"5px 6px",textAlign:"right",color:r.diff>=0?"#1565C0":"#C62828",fontWeight:700}}>{r.diff>=0?"+":""}{r.diff.toLocaleString()}</td>
                        <td style={{padding:"5px 6px",textAlign:"right",fontWeight:700,color:r.cumulative>=0?"#2E7D32":"#C62828"}}>{r.cumulative.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 補助金・助成金管理タブ */}
      {mainTab==="subsidy"&&(()=>{
        const today3 = new Date();
        const todayStr3 = localDateStr(today3);
        const statusOpts = [{value:"未申請",label:"📋 未申請"},{value:"申請中",label:"⏳ 申請中"},{value:"採択",label:"✅ 採択"},{value:"不採択",label:"❌ 不採択"}];
        const isNearDeadline = (d) => {
          if(!d) return false;
          const diff = daysUntil(d);
          return diff>=0 && diff<=30;
        };
        return (<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".9rem",color:"#5c3d1e"}}>🎯 補助金・助成金スケジュール</div>
            <button style={{...S.btn,...S.btnS,width:"auto",padding:"6px 14px"}} onClick={()=>setMSubsidy({name:"",deadline:"",amount:"",status:"未申請",memo:""})}>＋ 追加</button>
          </div>
          {subsidyList.length===0&&<div style={{color:"#aaa",fontSize:".82rem",padding:"16px 0",textAlign:"center"}}>補助金情報がありません</div>}
          {subsidyList.map((s,i)=>{
            const near = isNearDeadline(s.deadline);
            const past = s.deadline && s.deadline < todayStr3;
            return (
              <div key={s.id||i} style={{...S.card,border:"1px solid "+(near?"#ff9800":past?"#eee":"#e0d9ce"),marginBottom:8,background:near?"#FFF3E0":"#fff"}}
                onClick={()=>setMSubsidy({...s,_idx:i})}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:".86rem",color:near?"#E65100":"#1c1a14"}}>{s.name||"（名称未設定）"}</div>
                    <div style={{fontSize:".72rem",color:near?"#E65100":"#888",marginTop:2}}>
                      {s.deadline?"申請期限："+s.deadline+(near?(daysUntil(s.deadline)===0?" ⚠️今日が期限":" ⚠️あと"+daysUntil(s.deadline)+"日"):""):"期限未設定"}
                    </div>
                    {s.amount&&<div style={{fontSize:".74rem",color:"#1B5E20",marginTop:1}}>予定金額：{Number(s.amount).toLocaleString()}円</div>}
                    {s.memo&&<div style={{fontSize:".7rem",color:"#666",marginTop:2}}>{s.memo}</div>}
                  </div>
                  <div style={{flexShrink:0}}>
                    <span style={{fontSize:".7rem",background:s.status==="採択"?"#E8F5E9":s.status==="不採択"?"#FFEBEE":s.status==="申請中"?"#E3F2FD":"#f5f0e8",
                      color:s.status==="採択"?"#2E7D32":s.status==="不採択"?"#C62828":s.status==="申請中"?"#1565C0":"#8B6914",
                      borderRadius:8,padding:"2px 8px",fontWeight:700}}>{s.status||"未申請"}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {/* 補助金編集モーダル */}
          <ModalWithSave open={!!mSubsidy} title={mSubsidy?._idx!==undefined?"補助金情報を編集":"補助金を追加"} onClose={()=>setMSubsidy(null)}
            onSave={()=>{
              if(!mSubsidy.name){showToast("名称を入力してください");return;}
              let list;
              if(mSubsidy._idx!==undefined){
                list = subsidyList.map((s,i)=>i===mSubsidy._idx?{...mSubsidy,id:s.id||uid0()}:s);
              } else {
                list = [...subsidyList,{...mSubsidy,id:uid0()}];
              }
              setSubsidyList(list);
              setMSubsidy(null);
              showToast("保存しました");
            }}>
            {mSubsidy&&<>
              <FG label="補助金名称"><Inp value={mSubsidy.name||""} onChange={v=>setMSubsidy({...mSubsidy,name:v})} placeholder="例：農業機械導入支援事業"/></FG>
              <R2>
                <FG label="申請期限"><Inp type="date" value={mSubsidy.deadline||""} onChange={v=>setMSubsidy({...mSubsidy,deadline:v})}/></FG>
                <FG label="予定金額（円）"><Inp type="number" value={mSubsidy.amount||""} onChange={v=>setMSubsidy({...mSubsidy,amount:v})} placeholder="例：500000"/></FG>
              </R2>
              <FG label="ステータス">
                <Sel value={mSubsidy.status||"未申請"} onChange={v=>setMSubsidy({...mSubsidy,status:v})} options={statusOpts}/>
              </FG>
              <FG label="メモ"><Inp value={mSubsidy.memo||""} onChange={v=>setMSubsidy({...mSubsidy,memo:v})} placeholder="担当窓口・必要書類など"/></FG>
              {mSubsidy._idx!==undefined&&<button onClick={()=>{if(window.confirm("削除しますか？")){setSubsidyList(subsidyList.filter((_,i)=>i!==mSubsidy._idx));setMSubsidy(null);showToast("削除しました");}}} style={{...S.btn,...S.btnR,marginTop:8}}>削除</button>}
            </>}
          </ModalWithSave>
        </>);
      })()}

    </div>
  );
}


function PlanScreen({ fields, crops, setCrops, plots, setPlots, setPlotsR, showToast, setScr }) {
  const [selFieldIdx, setSelFieldIdx] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mPlant, setMPlant] = useState(null);
  const [mBed,   setMBed]   = useState(null); // 区画編集（前作登録）  // 作付け編集モーダル
  const [drag, setDrag] = useState(null);     // ドラッグ中 {id, mode:"move"|"start"|"end", startX, origPlant, origHarvest}
  const [history,    setHistory]    = useState([]);   // undo/redo 履歴
  const [historyIdx, setHistoryIdx] = useState(-1);  // 現在の履歴位置
  const histRef = useRef({hist:[], idx:-1}); // 同期的なundo/redo管理
  const laneRef = useRef(null);                // ガント行の幅取得用
  const ganttScrollRef = useRef(null);         // ガントスクロールコンテナ

  const selField = fields[selFieldIdx];
  // この圃場の計画データ（plotsを流用。type:"plan"で区別）
  const plan = plots.find(p=>p.fieldId===selField?.id && p.kind==="plan");

  const PALETTE30=["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#34495e","#e84393","#00b894","#fdcb6e","#6c5ce7","#d63031","#0984e3","#00cec9","#fab1a0","#a29bfe","#ff7675","#55efc4","#ffeaa7","#fd79a8","#74b9ff","#81ecec","#ff7f50","#badc58","#f0932b","#eb4d4b","#22a6b3","#be2edd","#7ed6df"];
  const cropColorByType = type => {
    const keys = Object.keys(CDB);
    const idx = keys.indexOf(type);
    return idx>=0 ? PALETTE30[idx%30] : "#95a5a6";
  };
  const cropLabel = type => { const db=CDB[type]||{}; return (db.e||"🌱")+" "+(db.n||type); };
  // 品目オブジェクトから「絵文字 名前(品種)」を生成
  const cropFull = c => { if(!c) return ""; const db=CDB[c.type]||{}; const nm=getCropName(c); return (db.e||"🌱")+" "+nm+(c.variety?"("+c.variety+")":""); };

  // 計画を初期化（区画3つ）
  const initPlan = () => {
    const p = {
      id: uid0(), fieldId: selField?.id||"", kind:"plan", name:(selField?.name||"")+" 栽培計画",
      beds:[{id:uid0(),name:"区画1"},{id:uid0(),name:"区画2"},{id:uid0(),name:"区画3"}],
      plantings:[],
      cols:20,rows:20,cells:[],season:"",cellSize:30,  // plot互換用ダミー
    };
    setPlots([...plots, p], p);
    showToast("栽培計画を作成しました");
  };

  // undo/redo: historyは [{planId, before, after}] の配列
  const pushHistory = (planId, before, after) => {
    const {hist, idx} = histRef.current;
    const trimmed = hist.slice(0, idx+1);
    const newHist = [...trimmed, {planId, before, after}].slice(-50);
    const newIdx = newHist.length - 1;
    histRef.current = {hist:newHist, idx:newIdx};
    setHistory(newHist);
    setHistoryIdx(newIdx);
  };
  const savePlan = (updated, _before) => {
    if(_before) pushHistory(updated.id, _before, updated.plantings||[]);
    const n = plots.map(p=>p.id===updated.id?updated:p);
    setPlots(n, updated);
  };
  const undo = () => {
    const {hist, idx} = histRef.current;
    if(idx<0) return;
    const h = hist[idx];
    const target = plots.find(p=>p.id===h.planId);
    if(!target) return;
    const restored = {...target, plantings: h.before};
    const newIdx = idx - 1;
    histRef.current = {hist, idx:newIdx};
    setPlots(plots.map(p=>p.id===restored.id?restored:p), restored);
    setHistoryIdx(newIdx);
    showToast("元に戻しました");
  };
  const redo = () => {
    const {hist, idx} = histRef.current;
    if(idx>=hist.length-1) return;
    const h = hist[idx+1];
    const target = plots.find(p=>p.id===h.planId);
    if(!target) return;
    const restored = {...target, plantings: h.after};
    const newIdx = idx + 1;
    histRef.current = {hist, idx:newIdx};
    setPlots(plots.map(p=>p.id===restored.id?restored:p), restored);
    setHistoryIdx(newIdx);
    showToast("やり直しました");
  };
  // ガント表示時に今日の位置へスクロール
  useEffect(()=>{
    if(!ganttScrollRef.current||!plan) return;
    const el = ganttScrollRef.current;
    // ガント本体と同じ計算式で今日のpxを算出してスクロール
    const scrollToToday = () => {
      const allPl=(plan.plantings||[]).filter(p=>p.plantDate);
      const allDates=allPl.flatMap(p=>[p.plantDate,p.harvestDate]).filter(Boolean);
      const minYear=allDates.length
        ? new Date(allDates.reduce((a,b)=>a<b?a:b)).getFullYear()
        : new Date().getFullYear();
      const maxYear=allDates.length
        ? new Date(allDates.reduce((a,b)=>a>b?a:b)).getFullYear()
        : new Date().getFullYear();
      const startYear=minYear;
      const endYear=maxYear+1;
      const totalMonths=(endYear-startYear)*12+12;
      const COL_W=52;
      const LABEL_W=72;
      const totalW=totalMonths*COL_W;
      const ganttStart=new Date(startYear,0,1).getTime();
      const ganttEnd=new Date(endYear,11,31,23,59,59).getTime();
      const ganttSpan=ganttEnd-ganttStart;
      const today=new Date(); today.setHours(0,0,0,0);
      // ガント本体と同じ dateToPx 計算
      const todayPx=Math.max(0,Math.min(totalW,(today.getTime()-ganttStart)/ganttSpan*totalW));
      // 今日が画面左1/3の位置に来るようスクロール
      const scrollTo=Math.max(0, LABEL_W+todayPx - el.clientWidth*0.33);
      el.scrollLeft=scrollTo;
    };
    // rAF2回重ねてDOMが確実に描画された後に実行
    requestAnimationFrame(()=>requestAnimationFrame(scrollToToday));
  },[plan?.id]);

  // Ctrl+Z / Ctrl+Y キーボードショートカット
  useEffect(()=>{
    const onKey = e => {
      if((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey){ e.preventDefault(); undo(); }
      if((e.ctrlKey||e.metaKey) && (e.key==='y' || (e.key==='z'&&e.shiftKey))){ e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[historyIdx, history, plots]);

  // ガントバーのドラッグ（伸縮・移動）
  const pxToDays = (dx)=>{
    // COL_W=52px/月 → 1px = (30.44日/52) ≈ 0.585日
    const COL_W=52;
    const msPerPx = (365.25/12*86400000)/COL_W;
    return Math.round(dx*msPerPx/86400000);
  };
  const addDays = (dateStr, days)=>{ const d=new Date(dateStr); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
  const onDragStart = (e, pl, mode)=>{
    e.stopPropagation();
    const clientX = e.touches?e.touches[0].clientX:e.clientX;
    const clientY = e.touches?e.touches[0].clientY:e.clientY;
    const hv = pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
    setDrag({id:pl.id, mode, startX:clientX, startY:clientY, origPlant:pl.plantDate, origHarvest:hv, origBed:pl.bedId, moved:false});
  };
  useEffect(()=>{
    if(!drag) return;
    const onMove = (e)=>{
      if(e.touches && e.cancelable) e.preventDefault();  // タッチ時はスクロールより移動を優先
      const clientX = e.touches?e.touches[0].clientX:e.clientX;
      const dx = clientX - drag.startX;
      const days = pxToDays(dx);
      if(Math.abs(days)<1 && !drag.moved) return;
      setDrag(d=>({...d,moved:true}));
      const cur = (plan.plantings||[]).find(p=>p.id===drag.id);
      if(!cur) return;
      let np=drag.origPlant, nh=drag.origHarvest, nbed=drag.origBed;
      if(drag.mode==="move"){
        np=addDays(drag.origPlant,days); nh=addDays(drag.origHarvest,days);
        // 縦方向: ドラッグ位置の区画行を判定して区画変更
        const clientY=e.touches?e.touches[0].clientY:e.clientY;
        const el=document.elementFromPoint(clientX, clientY);
        const bedEl=el&&el.closest?el.closest("[data-bedrow]"):null;
        if(bedEl&&bedEl.dataset.bedrow){ nbed=bedEl.dataset.bedrow; }
      }
      else if(drag.mode==="start"){ np=addDays(drag.origPlant,days); if(np>=nh) np=drag.origHarvest; }
      else if(drag.mode==="end"){ nh=addDays(drag.origHarvest,days); if(nh<=np) nh=drag.origPlant; }
      const plantings=plan.plantings.map(p=>p.id===drag.id?{...p,plantDate:np,harvestDate:nh,bedId:nbed}:p);
      setPlotsR(plots.map(pp=>pp.id===plan.id?{...plan,plantings}:pp));
    };
    const onUp = ()=>{
      const planNow=plots.find(p=>p.id===plan.id);
      const cur=(planNow?.plantings||[]).find(p=>p.id===drag.id);
      if(cur && drag.moved){
        const beforePlantings=(planNow?.plantings||[]).map(p=>
          p.id===drag.id?{...p,plantDate:drag.origPlant,harvestDate:drag.origHarvest,bedId:drag.origBed}:p
        );
        savePlan(planNow, beforePlantings);
        showToast("期間を変更しました");
      }
      setDrag(null);
    };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    window.addEventListener("touchmove",onMove,{passive:false});
    window.addEventListener("touchend",onUp);
    return ()=>{
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseup",onUp);
      window.removeEventListener("touchmove",onMove);
      window.removeEventListener("touchend",onUp);
    };
  },[drag, plan, plots]);

  const addBed = () => {
    const beds=[...(plan.beds||[]), {id:uid0(), name:"区画"+((plan.beds?.length||0)+1)}];
    savePlan({...plan, beds});
  };
  const renameBed = (bedId) => {
    const bed=plan.beds.find(b=>b.id===bedId);
    const nm=window.prompt("区画名を変更", bed?.name||"");
    if(nm===null)return;
    savePlan({...plan, beds:plan.beds.map(b=>b.id===bedId?{...b,name:nm}:b)});
  };
  const deleteBed = (bedId) => {
    if(!window.confirm("この区画と作付けを削除しますか？"))return;
    savePlan({...plan, beds:plan.beds.filter(b=>b.id!==bedId), plantings:(plan.plantings||[]).filter(pl=>pl.bedId!==bedId)});
  };

  // 作付けの保存（前作データも区画に保存）
  const savePlanting = () => {
    if(!mPlant.cropId){ showToast("品目を選択してください"); return; }
    if(!mPlant.plantDate){ showToast("定植日を入力してください"); return; }
    const pl={...mPlant, id:mPlant.id||uid0()};
    // plから前作データを除いてplantingsへ保存（prevCropsは区画側に持つ）
    const {_prevCrops, ...plSave}=pl;
    const exists=(plan.plantings||[]).some(x=>x.id===plSave.id);
    const plantings=exists?plan.plantings.map(x=>x.id===plSave.id?plSave:x):[...(plan.plantings||[]),plSave];
    // 前作データを区画(bed.prevCrops)に反映
    const beds=(plan.beds||[]).map(b=>{
      if(b.id!==plSave.bedId) return b;
      return {...b, prevCrops: pl._prevCrops||b.prevCrops||[]};
    });
    savePlan({...plan, plantings, beds});
    setMPlant(null);
    showToast("保存しました");
  };
  const deletePlanting = (id) => {
    savePlan({...plan, plantings:plan.plantings.filter(x=>x.id!==id)});
    setMPlant(null);
    showToast("削除しました");
  };

  // 計画の作付けを実際の栽培中品目として登録
  const plantToCrop = (pl) => {
    const tmpl = crops.find(x=>x.id===pl.cropId);  // 計画で参照していた品目（テンプレ）
    if(!tmpl){ showToast("品目が見つかりません"); return; }
    if(!window.confirm(cropFull(tmpl)+"を栽培中の品目として登録しますか？")) return;
    const fieldIdx = fields.findIndex(f=>f.id===selField?.id);
    const newCrop = {
      ...tmpl,
      id: uid0(),
      fieldIdx: fieldIdx>=0?fieldIdx:0,
      fieldId: selField?.id||"",
      plantDate: pl.plantDate||"",
      sowDate: tmpl.startMethod==="sow"?(pl.plantDate||""):"",
      ended:false, endDate:"",
      _fromPlan:true,
    };
    setCrops([...crops, newCrop], newCrop, fields);
    // 計画側に登録済みフラグ
    savePlan({...plan, plantings:plan.plantings.map(x=>x.id===pl.id?{...x,registered:true,cropRealId:newCrop.id}:x)});
    setMPlant(null);
    showToast("栽培中の品目に登録しました🌱");
    if(setScr) setScr("fields");
  };

  // 収穫予定日を品目から自動計算
  const calcHarvest = (cropId, plantDate) => {
    if(!plantDate) return "";
    const c=crops.find(x=>x.id===cropId);
    const db=c?CDB[c.type]||{}:{};
    const days=parseInt(c?.harvestDays)||db.maturity?.[c?.maturity||"mid"]||db.d||90;
    const d=new Date(plantDate); d.setDate(d.getDate()+days);
    return d.toISOString().slice(0,10);
  };

  // 連作チェック：同じ区画で前作と次作が同じNG科＆間隔がNG年数未満
  const checkPlanRotation = () => {
    const warns=[];
    if(!plan) return warns;
    (plan.beds||[]).forEach(bed=>{
      const plantings=(plan.plantings||[]).filter(p=>p.bedId===bed.id&&p.plantDate)
        .map(p=>{const c=crops.find(x=>x.id===p.cropId);return{...p,crop:c,fam:c?FAMILY_DB[c.type]:null,rot:c?ROTATION_DB[c.type]:null};})
        .sort((a,b)=>a.plantDate.localeCompare(b.plantDate));

      // ── A: 登録済み前作 vs 現在の作付け ──
      (bed.prevCrops||[]).forEach(prev=>{
        const prevFam = FAMILY_DB[prev.type]||null;
        const prevRot = ROTATION_DB[prev.type]||null;
        if(!prevFam||!prevRot||prevRot.years<=0) return;
        const prevEnd = prev.harvestDate || prev.plantDate || "";
        plantings.forEach(cur=>{
          if(!cur.fam) return;
          const sameFam = cur.fam===prevFam;
          const prevNgCur = prevRot?.ng?.includes(cur.fam);
          if(!sameFam && !prevNgCur) return;
          if(!cur.plantDate||!prevEnd) return;
          const gapYears=(new Date(cur.plantDate)-new Date(prevEnd))/(86400000*365);
          if(gapYears<0) return; // 前作の方が後なら無視
          const needYears=prevRot.years;
          if(gapYears<needYears){
            const shortYears=Math.round((needYears-gapYears)*10)/10;
            const prevLabel=(CDB[prev.type]?.n||prev.type)+(prev.variety?" ("+prev.variety+")":"");
            warns.push({bed:bed.name, cur:cropFull(cur.crop), past:prevLabel,
              fam:prevFam, years:needYears, gap:Math.floor(gapYears*10)/10, short:shortYears,
              isPrevCrop:true});
          }
        });
      });

    });
    return warns;
  };

  if(fields.length===0) return <div style={S.scr} className="scr-inner"><div style={{color:TX3,fontSize:".82rem",padding:16,textAlign:"center"}}>先に圃場を登録してください</div></div>;

  if(!plan){
    return (
      <div style={S.scr} className="scr-inner">
        <div style={S.sec}><span>📅 栽培計画</span></div>
        <FG label="圃場を選択"><Sel value={selFieldIdx} onChange={v=>setSelFieldIdx(parseInt(v))} options={fields.map((f,i)=>({value:i,label:f.name}))}/></FG>
        <div style={{color:TX3,fontSize:".82rem",padding:16,textAlign:"center"}}>この圃場の栽培計画はまだありません</div>
        <button style={{...S.btn,...S.btnG}} onClick={initPlan}>＋ 栽培計画を作る</button>
      </div>
    );
  }

  // ガント表示用：月のリスト（1〜12月）
  const months=Array.from({length:12},(_, i)=>i+1);
  const yearStart=new Date(year,0,1).getTime();
  const yearEnd=new Date(year,11,31).getTime();
  const yearSpan=yearEnd-yearStart;
  const warns=checkPlanRotation();

  return (
    <div style={S.scr} className="scr-inner">
      <div style={{...S.sec,flexWrap:"wrap",gap:6}}>
        <span>📅 栽培計画</span>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setYear(y=>y-1)} style={{...S.btn,...S.btnS,...S.btnSm}}>‹</button>
          <span style={{fontSize:".82rem",fontWeight:700,minWidth:46,textAlign:"center"}}>{year}年</span>
          <button onClick={()=>setYear(y=>y+1)} style={{...S.btn,...S.btnS,...S.btnSm}}>›</button>
          <div style={{width:1,height:16,background:"#e0d9ce",margin:"0 2px"}}/>
          <button onClick={undo} disabled={historyIdx<0}
            title="元に戻す (Ctrl+Z)"
            style={{...S.btn,...S.btnS,...S.btnSm,opacity:historyIdx<0?.35:1,fontSize:".8rem",padding:"4px 10px"}}>↩ 戻る</button>
          <button onClick={redo} disabled={historyIdx>=history.length-1}
            title="やり直す (Ctrl+Y)"
            style={{...S.btn,...S.btnS,...S.btnSm,opacity:historyIdx>=history.length-1?.35:1,fontSize:".8rem",padding:"4px 10px"}}>↪ 進む</button>
        </div>
      </div>

      <FG label="圃場を選択"><Sel value={selFieldIdx} onChange={v=>setSelFieldIdx(parseInt(v))} options={fields.map((f,i)=>({value:i,label:f.name}))}/></FG>

      {/* 連作警告 */}
      {warns.length>0&&<div style={{...S.card,background:"#fff8e1",border:"1px solid #f59e0b",padding:"10px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
          <span style={{fontSize:"1.1rem"}}>⚠️</span>
          <span style={{fontSize:".78rem",fontWeight:700,color:"#92400e"}}>連作注意</span>
          <span style={{background:"#f59e0b",color:"#fff",borderRadius:999,fontSize:".65rem",fontWeight:700,padding:"1px 7px"}}>{warns.length}件</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {warns.slice(0,8).map((w,i)=>{
          const pct=Math.min(100,Math.round((w.gap/w.years)*100));
          const col=pct<33?"#ef4444":pct<66?"#f59e0b":"#84cc16";
          return (
          <div key={i} style={{background:"#fff",borderRadius:8,padding:"7px 10px",border:"1px solid #fde68a"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:".8rem",fontWeight:700,color:"#1c1a14"}}>{w.cur}</span>
              <span style={{fontSize:".6rem",background:"#fef3c7",color:"#92400e",borderRadius:4,padding:"1px 5px"}}>{w.fam}</span>
              <span style={{fontSize:".6rem",color:"#6b7280",marginLeft:"auto"}}>{w.bed}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
              <span style={{fontSize:".62rem",color:"#6b7280"}}>前作:</span>
              <span style={{fontSize:".66rem",color:"#5a5040"}}>{w.past}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{flex:1,background:"#e5e7eb",borderRadius:999,height:6,overflow:"hidden"}}>
                <div style={{width:pct+"%",height:"100%",background:col,borderRadius:999,transition:"width .5s"}}/>
              </div>
              <span style={{fontSize:".62rem",color:col,fontWeight:700,minWidth:60,textAlign:"right"}}>
                {w.gap}年/{w.years}年
              </span>
            </div>
            <div style={{fontSize:".6rem",color:"#ef4444",marginTop:2}}>あと{w.short}年必要</div>
          </div>
          );
        })}
        </div>
      </div>}

      {/* ガントチャート（全期間スクロール） */}
      {(()=>{
        // 全plantingsから表示期間を計算
        const allPl=(plan.plantings||[]).filter(p=>p.plantDate);
        const allDates=allPl.flatMap(p=>[p.plantDate,p.harvestDate||calcHarvest(p.cropId,p.plantDate)]).filter(Boolean);
        const minYear=allDates.length?new Date(allDates.reduce((a,b)=>a<b?a:b)).getFullYear():new Date().getFullYear();
        const maxYear=allDates.length?new Date(allDates.reduce((a,b)=>a>b?a:b)).getFullYear():new Date().getFullYear();
        const startYear=minYear-0;
        const endYear=maxYear+1;
        const totalMonths=(endYear-startYear)*12+12;
        const COL_W=52; // 1ヶ月あたりのpx幅
        const LABEL_W=72; // 区画ラベル幅
        const totalW=totalMonths*COL_W;
        // px変換
        const ganttStart=new Date(startYear,0,1).getTime();
        const ganttEnd=new Date(endYear,11,31,23,59,59).getTime();
        const ganttSpan=ganttEnd-ganttStart;
        const dateToPx=d=>{const t=new Date(d).getTime();return Math.max(0,Math.min(totalW,(t-ganttStart)/ganttSpan*totalW));};
        // 月ヘッダー生成
        const headerMonths=[];
        for(let y=startYear;y<=endYear;y++){
          for(let m=0;m<12;m++){
            headerMonths.push({y,m,label:m===0?y+"年"+(m+1)+"月":(m+1)+"月"});
          }
        }
        return (
        <div style={{...S.card,padding:0,overflow:"hidden"}}>
          {/* スクロールコンテナ */}
          <div ref={ganttScrollRef} style={{overflowX:"auto",overflowY:"visible",WebkitOverflowScrolling:"touch"}} className="no-select">
            <div style={{display:"table",minWidth:LABEL_W+totalW,userSelect:"none",WebkitUserSelect:"none"}}>
              {/* 月ヘッダー行 */}
              <div style={{display:"flex",position:"sticky",top:0,zIndex:10,background:"#f8f5ef",borderBottom:"2px solid #e0d9ce"}}>
                <div style={{width:LABEL_W,flexShrink:0,fontSize:".68rem",fontWeight:700,color:"#5c3d1e",padding:"4px 4px",borderRight:"2px solid #e0d9ce",background:"#f8f5ef",position:"sticky",left:0,zIndex:11}}>区画</div>
                <div style={{display:"flex",flexShrink:0}}>
                  {headerMonths.map(({y,m,label},i)=>(
                    <div key={i} style={{width:COL_W,flexShrink:0,fontSize:".58rem",color:m===0?"#2d6a3f":TX3,
                      textAlign:"center",borderLeft:"1px solid #f0ebe3",padding:"3px 0",
                      fontWeight:m===0?700:400,
                      background:m===0?"#eaf7ee":"#f8f5ef"}}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              {/* 区画ごとの行 */}
              {(plan.beds||[]).map(bed=>{
                const items=(plan.plantings||[]).filter(p=>p.bedId===bed.id&&p.plantDate);
                const sorted=[...items].sort((a,b)=>(a.plantDate||"").localeCompare(b.plantDate||""));
                const lanes=[];
                const laneOf={};
                sorted.forEach(pl=>{
                  const hv=pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
                  let placed=-1;
                  for(let li=0;li<lanes.length;li++){if(pl.plantDate>=lanes[li]){placed=li;break;}}
                  if(placed<0){placed=lanes.length;lanes.push(hv);}else{lanes[placed]=hv;}
                  laneOf[pl.id]=placed;
                });
                const laneCount=Math.max(1,lanes.length);
                const rowH=laneCount*30+10;
                return (
                  <div key={bed.id} style={{display:"flex",borderBottom:"1px solid #f0ebe3",minHeight:rowH}}>
                    {/* 区画ラベル（固定） */}
                    <div style={{width:LABEL_W,flexShrink:0,fontSize:".7rem",display:"flex",flexDirection:"column",justifyContent:"center",padding:"4px 4px",borderRight:"2px solid #e0d9ce",background:"#f8f5ef",position:"sticky",left:0,zIndex:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <span onClick={()=>setMBed({...bed, prevCrops:bed.prevCrops||[]})} style={{fontWeight:700,cursor:"pointer",color:"#5c3d1e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bed.name}</span>
                      {(bed.prevCrops||[]).length>0&&<span style={{fontSize:".55rem",background:"#E8F5E9",color:"#2E7D32",borderRadius:3,padding:"1px 4px",flexShrink:0}}>前作{(bed.prevCrops||[]).length}件</span>}
                    </div>
                      <div style={{display:"flex",gap:2,marginTop:2}}>
                        <button onClick={()=>setMPlant({bedId:bed.id,cropId:"",plantDate:"",harvestDate:"",year,_prevCrops:bed.prevCrops||[]})} style={{fontSize:".58rem",border:"none",background:G3,color:G,borderRadius:4,padding:"1px 4px",cursor:"pointer"}}>＋</button>
                        <button onClick={()=>deleteBed(bed.id)} style={{fontSize:".58rem",border:"none",background:"#fee2e2",color:"#b91c1c",borderRadius:4,padding:"1px 4px",cursor:"pointer"}}>×</button>
                      </div>
                    </div>
                    {/* バーエリア */}
                    <div style={{width:totalW,flexShrink:0,position:"relative",minHeight:rowH}}>
                      {/* 月の区切り線・年境界 */}
                      {headerMonths.map(({y,m},i)=>(
                        <div key={i} style={{position:"absolute",left:i*COL_W,top:0,bottom:0,
                          width:m===0?2:1,background:m===0?"#c8e6c9":"#f0ebe3",zIndex:0}}/>
                      ))}
                      {/* 今日の線 */}
                      {(()=>{const tx=dateToPx(new Date().toISOString().slice(0,10));return tx>0&&tx<totalW?<div style={{position:"absolute",left:tx,top:0,bottom:0,width:2,background:"#ef4444",zIndex:1,opacity:.7}}/>:null;})()}
                      {/* 作付けバー */}
                      {items.map(pl=>{
                        const c=crops.find(x=>x.id===pl.cropId);
                        if(!c)return null;
                        const hv=pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
                        const lx=dateToPx(pl.plantDate);
                        const rx=dateToPx(hv);
                        const bw=Math.max(4,rx-lx);
                        return (
                          <div key={pl.id} className="gantt-bar"
                            style={{position:"absolute",left:lx,width:bw,top:4+(laneOf[pl.id]||0)*30,height:26,
                              background:cropColorByType(c.type),borderRadius:5,display:"flex",alignItems:"center",
                              fontSize:".6rem",color:"#fff",overflow:"hidden",whiteSpace:"nowrap",
                              boxShadow:"0 1px 3px rgba(0,0,0,.2)",touchAction:"none",zIndex:2}}>
                            <div onMouseDown={e=>onDragStart(e,pl,"start")} onTouchStart={e=>onDragStart(e,pl,"start")}
                              style={{width:8,height:"100%",cursor:"ew-resize",flexShrink:0,background:"rgba(255,255,255,.25)"}}/>
                            <div onMouseDown={e=>onDragStart(e,pl,"move")} onTouchStart={e=>onDragStart(e,pl,"move")}
                              onClick={()=>{if(!drag||!drag.moved){const _bed=plan.beds.find(b=>b.id===pl.bedId);setMPlant({...pl,year,_prevCrops:(_bed?.prevCrops||[])});};}}
                              style={{flex:1,height:"100%",display:"flex",alignItems:"center",paddingLeft:3,cursor:"grab",overflow:"hidden"}}>
                              {cropFull(c)}
                            </div>
                            <div onMouseDown={e=>onDragStart(e,pl,"end")} onTouchStart={e=>onDragStart(e,pl,"end")}
                              style={{width:8,height:"100%",cursor:"ew-resize",flexShrink:0,background:"rgba(255,255,255,.25)"}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}
      <button style={{...S.btn,...S.btnS,marginTop:8}} onClick={addBed}>＋ 区画を追加</button>

      {/* 凡例 */}
      <div style={{...S.card,marginTop:8}}>
        <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:6}}>作付け一覧</div>
        {(()=>{
          const all=(plan.plantings||[]).sort((a,b)=>(b.plantDate||"").localeCompare(a.plantDate||""));
          if(!all.length)return <div style={{fontSize:".72rem",color:TX3}}>作付けがありません。区画の「＋」から追加してください</div>;
          return all.map(pl=>{
            const c=crops.find(x=>x.id===pl.cropId);if(!c)return null;
            const bed=plan.beds.find(b=>b.id===pl.bedId);
            const hv=pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
            const rot=ROTATION_DB[c.type];
            return (
              <div key={pl.id} onClick={()=>{const _bed=plan.beds.find(b=>b.id===pl.bedId);setMPlant({...pl,year,_prevCrops:(_bed?.prevCrops||[])});}} style={{display:"flex",alignItems:"center",gap:8,fontSize:".74rem",padding:"6px 0",borderBottom:"1px solid #f0ebe3",cursor:"pointer"}}>
                <span style={{display:"inline-block",width:12,height:12,borderRadius:3,background:cropColorByType(c.type),flexShrink:0}}/>
                <span style={{flex:1}}>{cropLabel(c.type)}{c.variety?"("+c.variety+")":""}</span>
                <span style={{color:TX3,fontSize:".68rem"}}>{bed?.name}·{fmtMD(pl.plantDate)}〜{fmtMD(hv)}</span>
                {rot&&rot.years>0&&<span style={{fontSize:".64rem",color:"#856404",background:"#fff3cd",borderRadius:5,padding:"1px 5px"}}>連作{rot.years}年</span>}
              </div>
            );
          });
        })()}
      </div>

      {/* 区画編集モーダル（前作登録） */}
      <ModalWithSave open={!!mBed} title={"区画："+( mBed?.name||"")} onClose={()=>setMBed(null)}
        onSave={()=>{
          const beds=(plan.beds||[]).map(b=>b.id===mBed.id?{...mBed}:b);
          savePlan({...plan,beds});
          setMBed(null);
          showToast("区画情報を保存しました");
        }}>
        {mBed&&<>
          <FG label="区画名">
            <Inp value={mBed.name||""} onChange={v=>setMBed({...mBed,name:v})}/>
          </FG>
          <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".82rem",color:"#5c3d1e",margin:"10px 0 6px"}}>
            🌱 前作の登録（連作チェックに使用）
          </div>
          <div style={{fontSize:".72rem",color:"#6b7280",marginBottom:8}}>
            この区画で以前に栽培した作物を登録すると、連作注意を確認できます
          </div>
          {(mBed.prevCrops||[]).map((pc,pi)=>(
            <div key={pi} style={{background:"#f6f3ec",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:".74rem",fontWeight:700}}>前作 {pi+1}</span>
                <button onClick={()=>setMBed({...mBed,prevCrops:mBed.prevCrops.filter((_,i)=>i!==pi)})}
                  style={{...S.btn,...S.btnR,...S.btnSm,fontSize:".65rem"}}>削除</button>
              </div>
              <R2>
                <FG label="品目">
                  <Sel value={pc.type||""} onChange={v=>setMBed({...mBed,prevCrops:mBed.prevCrops.map((x,i)=>i===pi?{...x,type:v}:x)})}
                    options={[{value:"",label:"（選択）"},...Object.entries(CDB).map(([k,v2])=>({value:k,label:(v2.e||"🌱")+" "+(v2.n||k)}))]}/>
                </FG>
                <FG label="品種（任意）">
                  <Inp value={pc.variety||""} onChange={v=>setMBed({...mBed,prevCrops:mBed.prevCrops.map((x,i)=>i===pi?{...x,variety:v}:x)})}
                    placeholder="例：桃太郎"/>
                </FG>
              </R2>
              <FG label="収穫（終了）年月日">
                <Inp type="date" value={pc.harvestDate||""} onChange={v=>setMBed({...mBed,prevCrops:mBed.prevCrops.map((x,i)=>i===pi?{...x,harvestDate:v}:x)})}/>
              </FG>
            </div>
          ))}
          <button style={{...S.btn,...S.btnS,width:"100%"}}
            onClick={()=>setMBed({...mBed,prevCrops:[...(mBed.prevCrops||[]),{type:"",variety:"",harvestDate:""}]})}>
            ＋ 前作を追加
          </button>
        </>}
      </ModalWithSave>

      {/* 作付け編集モーダル */}
      <ModalWithSave open={!!mPlant} onClose={()=>setMPlant(null)} title={mPlant?.id?"作付けを編集":"作付けを追加"} onSave={savePlanting}>
        {mPlant&&<>
          <FG label="区画（変更で別区画へ移動）"><Sel value={mPlant.bedId} onChange={v=>setMPlant({...mPlant,bedId:v})} options={(plan.beds||[]).map(b=>({value:b.id,label:b.name}))}/></FG>
          <FG label="品目">
            <Sel value={mPlant.cropId} onChange={v=>{const hv=calcHarvest(v,mPlant.plantDate);setMPlant({...mPlant,cropId:v,harvestDate:hv});}}
              options={makeCropOptions(crops.filter(c=>!c.ended))}/>
          </FG>
          <R2>
            <FG label="定植・播種日"><Inp type="date" value={mPlant.plantDate} onChange={v=>{const hv=calcHarvest(mPlant.cropId,v);setMPlant({...mPlant,plantDate:v,harvestDate:hv});}}/></FG>
            <FG label="収穫予定日"><Inp type="date" value={mPlant.harvestDate} onChange={v=>setMPlant({...mPlant,harvestDate:v})}/></FG>
          </R2>
          <div style={{fontSize:".68rem",color:TX3,marginBottom:8,lineHeight:1.5}}>💡 品目と定植日を選ぶと収穫予定日を自動計算します（手動で調整可）<br/>同じ区画に同時期の作付けを複数追加すると、混植として縦に並べて表示されます</div>

          {/* 前作登録セクション */}
          <div style={{borderTop:"1px solid #e0d9ce",marginTop:12,paddingTop:12}}>
            <div style={{fontSize:".78rem",fontWeight:700,color:"#5c3d1e",marginBottom:8}}>
              🌱 前作の登録（連作チェックに使用）
            </div>
            {(mPlant._prevCrops||[]).map((pc,pi)=>(
              <div key={pi} style={{background:"#f8f5ef",borderRadius:8,padding:"8px 10px",marginBottom:8,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:".74rem",fontWeight:700}}>前作 {pi+1}</span>
                  <button onClick={()=>setMPlant({...mPlant,_prevCrops:(mPlant._prevCrops||[]).filter((_,i)=>i!==pi)})}
                    style={{border:"none",background:"none",color:"#ef4444",fontSize:".8rem",cursor:"pointer",padding:"2px 4px"}}>✕</button>
                </div>
                <FG label="品目">
                  <Sel value={pc.type||""} onChange={v=>setMPlant({...mPlant,_prevCrops:(mPlant._prevCrops||[]).map((x,i)=>i===pi?{...x,type:v}:x)})}
                    options={[{value:"",label:"（選択）"},...Object.entries(CDB).map(([k,v])=>({value:k,label:v.n}))]}/>
                </FG>
                <FG label="品種（任意）">
                  <Inp value={pc.variety||""} onChange={v=>setMPlant({...mPlant,_prevCrops:(mPlant._prevCrops||[]).map((x,i)=>i===pi?{...x,variety:v}:x)})}
                    placeholder="例：大玉、中玉"/>
                </FG>
                <FG label="収穫日（任意）">
                  <Inp type="date" value={pc.harvestDate||""} onChange={v=>setMPlant({...mPlant,_prevCrops:(mPlant._prevCrops||[]).map((x,i)=>i===pi?{...x,harvestDate:v}:x)})}/>
                </FG>
              </div>
            ))}
            <button style={{...S.btn,...S.btnS,fontSize:".74rem",padding:"4px 10px"}}
              onClick={()=>setMPlant({...mPlant,_prevCrops:[...(mPlant._prevCrops||[]),{type:"",variety:"",harvestDate:""}]})}>
              ＋ 前作を追加
            </button>
          </div>

          {mPlant.id&&!mPlant.registered&&<button onClick={()=>plantToCrop(mPlant)} style={{...S.btn,...S.btnG,marginTop:8}}>🌱 この作付けを実際に植える（品目登録）</button>}
          {mPlant.registered&&<div style={{fontSize:".72rem",color:G,background:G3,borderRadius:8,padding:"8px 10px",marginTop:8,textAlign:"center"}}>✓ 栽培中の品目に登録済み</div>}
          {mPlant.id&&<button onClick={()=>deletePlanting(mPlant.id)} style={{...S.btn,...S.btnR,marginTop:8}}>この作付けを削除</button>}
        </>}
      </ModalWithSave>
    </div>
  );
}


function ReportScreen({ fields, crops, logs, costs, fertMs, pestMs, equips=[], openLb }) {
  const [selCropId, setSelCropId] = useState("all");
  const [climateData, setClimateData] = useState(null); // 気象データ（daily+monthly）
  const [climateLoading, setClimateLoading] = useState(false);
  const [period,    setPeriod]    = useState("year");  // "year" or "month"
  const [selYear,   setSelYear]   = useState(new Date().getFullYear());
  const [selMonth,  setSelMonth]  = useState(new Date().getMonth()+1);
  // 積算温度設定（品目ごと・localStorageで保存）
  const [gddSettings, setGddSettings] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("gddSettings")||"{}"); } catch { return {}; }
  });
  const [showGddConfig, setShowGddConfig] = useState(false);

  // 収益予測（品目ごと・localStorageで保存）
  const [revenueForecasts, setRevenueForecastsState] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("revenueForecasts")||"{}"); } catch { return {}; }
  });
  const [showForecast, setShowForecast] = useState(false);
  const setRevenueForecasts = (val) => {
    setRevenueForecastsState(val);
    try { localStorage.setItem("revenueForecasts", JSON.stringify(val)); } catch {}
  };
  const saveForecast = (cropId, patch) => {
    setRevenueForecasts({...revenueForecasts, [cropId]:{...(revenueForecasts[cropId]||{}),...patch}});
  };

  const saveGddSetting = (cropId, patch) => {
    setGddSettings(prev=>{
      const next={...prev,[cropId]:{...(prev[cropId]||{}),...patch}};
      try { localStorage.setItem("gddSettings",JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // 利用可能な年・月リスト
  const allDates = [...logs, ...costs].map(x=>x.date||'').filter(Boolean);
  const years = [...new Set([String(selYear), ...allDates.map(d=>d.slice(0,4)).filter(Boolean)])].sort().reverse();
  const months = period==="month" ? [...new Set([
    selMonth, ...allDates.filter(d=>d.startsWith(String(selYear))).map(d=>Number(d.slice(5,7)))
  ])].sort((a,b)=>b-a) : [];

  // 期間フィルター関数
  const inPeriod = date => {
    if(!date) return false;
    if(period==="crop") {
      return true; // 栽培期間モードは日付制限なし・全期間表示
    }
    if(period==="year") return date.startsWith(String(selYear));
    return date.startsWith(String(selYear)+"-"+String(selMonth).padStart(2,"0"));
  };
  // 費用の計上額（申告と同じ扱い）：取消・収入・事業主借は0、家事按分は農業分のみ、
  // 耐用年数のある農機具の購入は期間の減価償却費として計上
  const kaigyoR = readLS("sakumemo_kaigyo_date","");
  const apR = readLSJson("apportionRates",{});
  const isAssetPurchaseR = makeIsAssetPurchase(equips);
  const agriAmtR = co => { const r = co.apportionRate!==undefined ? co.apportionRate : apR[co.id]; const a=parseFloat(co.amt)||0; return (r!=null&&Number(r)<100)?Math.round(a*Number(r)/100):a; };
  const isRealExpense = co => co && !co.cancelled && !isIncome(co.cat) && co.cat!=="owner_loan" && !String(co.cat||"").startsWith("__");
  const costAmount = (co) => {
    if(!isRealExpense(co)) return 0;
    if(isAssetPurchaseR(co)){
      if(period==="crop") return agriAmtR(co);
      const eq = equips.find(e=>e.id===co.masterId);
      const d = depreciationFor(eq, Number(selYear), kaigyoR);
      if(!d.owned) return 0;
      if(period==="year") return d.annual;
      const st = (kaigyoR && String(eq.date) < kaigyoR) ? kaigyoR : String(eq.date);
      const sy=parseInt(st.slice(0,4)), sm=parseInt(st.slice(5,7))||1;
      if(Number(selYear)<sy || (Number(selYear)===sy && Number(selMonth)<sm)) return 0;
      const used = Number(selYear)===sy ? (12-sm+1) : 12;
      return d.annual/used;
    }
    return inPeriod(co.date) ? agriAmtR(co) : 0;
  };
  // 品目が未設定の種苗費：品目名・品種名が最もよく一致する1品目にだけ割り当てる（重複計上を防ぐ）
  const seedOwner = {};
  costs.filter(co=>co.cat==="seed" && !co.cropId).forEach(co=>{
    let best=null, bestScore=0;
    crops.forEach(c=>{ const n=getCropName(c)||"", v=c.variety||""; let sc=0;
      if(n && (co.name||"").includes(n)) sc+=n.length; if(v && (co.name||"").includes(v)) sc+=100+v.length;
      if(sc>bestScore){ best=c.id; bestScore=sc; } });
    if(best) seedOwner[co.id]=best;
  });
  // 品目に割り当てた売上（収入）
  const isRealIncome = co => co && !co.cancelled && isIncome(co.cat) && co.cat!=="inc_owner_draw";

  // 全品目のデータ集計
  // デバッグ: costs の内容を確認

  const cropStats = crops.map(c=>{
    const db=CDB[c.type]||{};
    const f=fields[c.fieldIdx]||{};
    const cl=logs.filter(l=>l.cropId===c.id && inPeriod(l.date));
    const kg=cl.reduce((s,l)=>s+(parseFloat(l.hvKg)||0),0);
    const cnt=cl.reduce((s,l)=>s+(parseInt(l.hvCnt)||0),0);
    const hvRev=cl.reduce((s,l)=>s+(parseFloat(l.hvKg)||0)*(parseFloat(l.hvPrice)||0),0);
    const salesRev=costs.filter(co=>isRealIncome(co) && co.cropId===c.id && (period==="crop"||inPeriod(co.date))).reduce((s,co)=>s+(parseFloat(co.amt)||0),0);
    const rev = salesRev>0 ? salesRev : hvRev;
    const minutes=cl.reduce((s,l)=>s+(parseInt(l.duration)||0),0);
    const allCl=logs.filter(l=>l.cropId===c.id); // 株数は期間に関係なく現在の数
    const added=allCl.filter(l=>l.addCnt).reduce((s,l)=>s+(parseInt(l.addCnt)||0),0);
    const disc=allCl.filter(l=>l.discardCnt).reduce((s,l)=>s+(parseInt(l.discardCnt)||0),0);
    const stocks=(parseInt(c.stocks)||0)+added-disc;
    const sowLog=cl.find(l=>l.sowQty);
    const germLog=cl.find(l=>l.germinationCnt);
    const germRate=sowLog&&germLog?Math.round((parseInt(germLog.germinationCnt)/parseInt(sowLog.sowQty))*100):null;
    // 種・苗費用（この品目に直接紐づくもの、またはcropIdがない場合は品目名で照合）
    const cropName0 = getCropName(c);
    const seedCosts = costs.filter(co=>
      co.cat==="seed" && (co.cropId===c.id || seedOwner[co.id]===c.id)
    );
    const seedTotal = seedCosts.reduce((s,co)=>s+costAmount(co),0);
    // 施肥・農薬費用（作業記録のマスター単価×使用量で計算・単位変換あり）
    let fertTotal=0, pestTotal=0;
    cl.forEach(l=>{
      // 使用量（在庫を減らす量と同じ計算＝logUsageOf）× 資材の単価（購入価格÷内容量）
      if(l.fertName) {
        const fm=fertMs.find(f=>f.name===l.fertName);
        if(fm?.price && parseFloat(fm.capacity)>0) {
          const u = logUsageOf({...l, work:"fert"}, fm);
          if(u>0) fertTotal += Math.round(parseFloat(fm.price)/parseFloat(fm.capacity) * u);
        }
      }
      if(l.pestName && l.pestAmt && parseFloat(l.pestAmt)>0) {
        const pm=pestMs.find(p=>p.name===l.pestName);
        if(pm?.price && parseFloat(pm.capacity)>0) {
          const u = logUsageOf({...l, work:"pest"}, pm);
          if(u>0) pestTotal += Math.round(parseFloat(pm.price)/parseFloat(pm.capacity) * u);
        }
      }
    });
    // この品目にcropIdで明示的に割り当てられた費用（手動割当含む・seed自動分は二重計上回避のため除外）
    const assignedCosts = costs.filter(co=>
      co.cropId===c.id && co.cat!=="seed" && !co.logId && isRealExpense(co)  // logId付き(施肥/防除自動)とseedは別集計済み
    );
    const assignedTotal = assignedCosts.reduce((s,co)=>s+costAmount(co),0);
    const costTotal = seedTotal + fertTotal + pestTotal + assignedTotal;
    const h=Math.floor(minutes/60), m=minutes%60;
    const timeStr=minutes>0?(h>0?h+"時間"+m+"分":m+"分"):"—";
    const name=(getCropName(c))+(c.variety?" ("+c.variety+")":"");
    // 施肥・農薬の使用量集計（原液量で集計）
    const fertUse={}; // {name: {amt, unit}}
    const pestUse={}; // {name: {amt, unit}}
    cl.filter(l=>l.fertName).forEach(l=>{
      let useAmt=0, useUnit=l.fertUnit||"";
      if(l.fertDil && l.fertSprayAmt && parseFloat(l.fertSprayAmt)>0){
        useAmt = parseFloat(l.fertSprayAmt)/(parseFloat(l.fertDil)||1);
        useUnit = l.fertSprayUnit||l.fertUnit||"L";
      } else if(parseFloat(l.fertAmt)>0){
        useAmt = parseFloat(l.fertAmt); useUnit = l.fertUnit||"";
      }
      if(useAmt>0){
        if(!fertUse[l.fertName]) fertUse[l.fertName]={amt:0,unit:useUnit};
        fertUse[l.fertName].amt+=useAmt;
      }
    });
    cl.filter(l=>l.pestName&&l.pestAmt&&parseFloat(l.pestAmt)>0).forEach(l=>{
      // 農薬は散布量÷希釈倍率=原液量
      const dil=parseFloat(l.pestDil)||1;
      const useAmt=parseFloat(l.pestAmt)/(dil>0?dil:1);
      const useUnit=l.pestUnit||"L";
      if(!pestUse[l.pestName]) pestUse[l.pestName]={amt:0,unit:useUnit};
      pestUse[l.pestName].amt+=useAmt;
    });
    return{id:c.id,name,emoji:db.e||"🌱",field:f.name||"?",ended:c.ended||false,endDate:c.endDate||"",
      kg,cnt,rev,minutes,timeStr,stocks,disc,added,germRate,costTotal,profit:rev-costTotal,
      seedTotal,fertTotal,pestTotal,assignedTotal,
      logCount:cl.length,plantDate:c.plantDate||"",sowDate:c.sowDate||"",
      growDays:(()=>{const st=c.plantDate||c.sowDate;if(!st)return null;const en=c.ended&&c.endDate?new Date(c.endDate):new Date();const d=Math.round((en-new Date(st))/86400000);return d>=0?d:null;})(),
      monthlyKg:(()=>{const mm={};cl.forEach(l=>{if(!l.date||!l.hvKg)return;const k=l.date.slice(0,7);mm[k]=(mm[k]||0)+(parseFloat(l.hvKg)||0);});return Object.entries(mm).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({month:k,kg:v}));})(),
      fertUse,pestUse};
  });

  // 選択中の品目データ
  const sel = selCropId==="all" ? null : cropStats.find(c=>c.id===selCropId);
  const dispLogs = (selCropId==="all" ? logs : logs.filter(l=>l.cropId===selCropId)).filter(l=>inPeriod(l.date)).sort((a,b)=>((a.date+a.time)<(b.date+b.time)?-1:1));

  // 全体集計
  const totalKg  = cropStats.reduce((s,c)=>s+c.kg,0);
  const unassignedSales = costs.filter(co=>isRealIncome(co) && !crops.some(c=>c.id===co.cropId) && (period==="crop"||inPeriod(co.date))).reduce((s,co)=>s+(parseFloat(co.amt)||0),0);
  const totalRev = cropStats.reduce((s,c)=>s+c.rev,0) + unassignedSales;
  const totalCost= costs.reduce((s,c)=>s+costAmount(c),0);
  const commonCost= costs.filter(c=>!c.cropId && !seedOwner[c.id]).reduce((s,c)=>s+costAmount(c),0);
  const totalMin = logs.filter(l=>inPeriod(l.date)).reduce((s,l)=>s+(parseInt(l.duration)||0),0);
  const th=Math.floor(totalMin/60),tm=totalMin%60;
  const totalTimeStr=totalMin>0?(th>0?th+"時間"+tm+"分":tm+"分"):"0分";


  // 品目選択時に栽培期間の気候データを取得（積算温度設定の開始日も考慮）
  useEffect(()=>{
    if(!sel) { setClimateData(null); return; }
    const crop=crops.find(c=>c.id===sel.id);
    if(!crop) return;
    const gs=gddSettings[sel.id]||{};
    const start=gs.startDate||crop.plantDate||crop.sowDate;
    const end=new Date(Math.min(
      crop.ended&&crop.endDate?new Date(crop.endDate):Infinity,
      new Date(new Date().setDate(new Date().getDate()+30)) // 未来30日まで取得
    )).toISOString().slice(0,10);
    if(!start) { setClimateData(null); return; }
    const fieldAddr=fields[crop.fieldIdx]?.addr||fields[0]?.addr||"";
    setClimateLoading(true);
    fetchClimateData(fieldAddr, start, end).then(data=>{
      setClimateData(data); setClimateLoading(false);
    }).catch(()=>{ setClimateLoading(false); });
  },[sel?.id, gddSettings[selCropId]?.startDate]);

  return (
    <div style={S.scr} className="scr-inner">
      {/* 期間セレクター + 品目バー sticky */}
      <div style={{position:"sticky",top:0,zIndex:190,background:"#f8f5ef",paddingTop:6,paddingBottom:2,marginLeft:-12,marginRight:-12,paddingLeft:12,paddingRight:12,boxShadow:"0 2px 4px rgba(0,0,0,.05)"}}>
      <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e0d9ce",flexShrink:0}}>
          {[["year","年単位"],["month","月単位"],...(selCropId!=="all"?[["crop","栽培期間"]]:[])]
            .map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)}
              style={{padding:"6px 12px",border:"none",background:period===v?G:"#fff",color:period===v?"#fff":"#888",fontWeight:period===v?700:400,fontSize:".78rem",cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>
        {period!=="crop"&&<select value={selYear} onChange={e=>setSelYear(Number(e.target.value))}
          style={{padding:"5px 8px",border:"1px solid #e0d9ce",borderRadius:8,fontSize:"15px",fontFamily:"inherit",background:"#fff",flexShrink:0}}>
          {(years.length?years:[new Date().getFullYear()]).map(y=><option key={y} value={y}>{y}年</option>)}
        </select>}
        {period==="month"&&<select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}
          style={{padding:"5px 8px",border:"1px solid #e0d9ce",borderRadius:8,fontSize:"15px",fontFamily:"inherit",background:"#fff",flexShrink:0}}>
          {(months.length?months:[1,2,3,4,5,6,7,8,9,10,11,12]).map(m=><option key={m} value={m}>{m}月</option>)}
        </select>}
      </div>

      {/* 品目リスト（折りたたみ） */}
      <div style={{marginBottom:10}}>
        {selCropId!=="all"&&<button onClick={()=>setSelCropId("all")}
          style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid "+G,background:"#fff",color:G,fontSize:".84rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{"← すべての品目に戻る"}</span>
        </button>}
      </div>
      </div>{/* /sticky period+cropbar */}

      {/* 選択品目の詳細 or 全体サマリー */}
      {sel ? (
        <>
          {/* 品目詳細 */}
          <div style={{...S.card,background:"linear-gradient(135deg,"+G+","+GD+")",color:"#fff",marginBottom:9}}>
            <div style={{fontSize:"1.1rem",fontWeight:700,marginBottom:4}}>{sel.emoji} {sel.name}</div>
            <div style={{fontSize:".74rem",opacity:.75,marginBottom:10}}>{sel.field}{sel.ended?" · 栽培終了 "+fmtYMD(sel.endDate):""}{sel.plantDate?" · 定植:"+fmtYMD(sel.plantDate):""}{sel.growDays!==null?" · 栽培"+sel.growDays+"日":""}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {n:sel.kg.toFixed(1)+"kg",l:"収穫量"},
                {n:sel.cnt+"個",l:"収穫個数"},
                {n:Math.round(sel.rev).toLocaleString()+"円",l:"推定収益"},
                {n:Math.round(sel.costTotal).toLocaleString()+"円",l:"費用合計"},
                {n:Math.round(sel.profit).toLocaleString()+"円",l:"損益"},
                {n:sel.timeStr,l:"作業時間"},
                {n:sel.stocks+"株",l:"現在株数"},
                {n:sel.germRate!==null?sel.germRate+"%":"—",l:"発芽率"},
                {n:sel.growDays!==null?sel.growDays+"日":"—",l:sel.ended?"栽培日数":"栽培経過"},
                {n:sel.logCount+"件",l:"作業記録数"},
              ].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.15)",borderRadius:9,padding:"6px 8px",textAlign:"center"}}>
                  <div style={{fontSize:"1.1rem",fontWeight:700,lineHeight:1.2}}>{s.n}</div>
                  <div style={{fontSize:".62rem",opacity:.7,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 品質別円グラフ */}
          {(()=>{
            const hvLogs=dispLogs.filter(l=>l.hvKg||l.hvGradeStr);
            const grades=["秀品","優品","良品","規格外"];
            const GCOL={"秀品":"#2d6a3f","優品":"#52b788","良品":"#95d5b2","規格外":"#aaa"};
            const gKg={};grades.forEach(g=>{gKg[g]=0;});
            hvLogs.forEach(l=>{
              if(l.hvGradeStr){l.hvGradeStr.split('/').forEach(s=>{const m=s.trim().match(/^(秀品|優品|良品|規格外):.*?([0-9.]+)kg/);if(m)gKg[m[1]]=(gKg[m[1]]||0)+parseFloat(m[2]);});}
              else{const q=l.hvQ&&grades.includes(l.hvQ)?l.hvQ:"秀品";gKg[q]=(gKg[q]||0)+(parseFloat(l.hvKg)||0);}
            });
            const tot=grades.reduce((s,g)=>s+(gKg[g]||0),0);
            if(tot<=0)return null;
            const cx=65,cy=65,r=55;
            const toXY=(deg,rad)=>{const a=(deg-90)*Math.PI/180;return[cx+rad*Math.cos(a),cy+rad*Math.sin(a)];};
            let cum=0;
            const slices=grades.filter(g=>gKg[g]>0).map(g=>{const s=cum;cum+=gKg[g]/tot*360;return{g,s,e:cum};});
            return(
              <div style={{...S.card,marginBottom:9}}>
                <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".82rem",color:"#5c3d1e",marginBottom:10}}>🥧 品質別収穫割合（kg）</div>
                <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                  <svg width="130" height="130" viewBox="0 0 130 130">
                    {slices.length===1
                      ?<circle cx={cx} cy={cy} r={r} fill={GCOL[slices[0].g]}/>
                      :slices.map((sl,i)=>{
                        const large=sl.e-sl.s>180?1:0;
                        const [x1,y1]=toXY(sl.s,r),[x2,y2]=toXY(sl.e,r);
                        const dd="M"+cx+","+cy+" L"+x1+","+y1+" A"+r+","+r+" 0 "+large+",1 "+x2+","+y2+" Z";
                        return <path key={i} d={dd} fill={GCOL[sl.g]}/>;
                      })
                    }
                  </svg>
                  <div>
                    {grades.filter(g=>gKg[g]>0).map(g=>(
                      <div key={g} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                        <div style={{width:12,height:12,borderRadius:2,background:GCOL[g],flexShrink:0}}/>
                        <span style={{fontSize:".76rem"}}><b>{g}</b> {gKg[g].toFixed(1)}kg ({Math.round(gKg[g]/tot*100)}%)</span>
                      </div>
                    ))}
                    <div style={{borderTop:"1px solid #e0d9ce",marginTop:5,paddingTop:5,fontSize:".76rem",fontWeight:700}}>合計 {tot.toFixed(1)}kg</div>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* 月別収穫推移 */}
          {sel.monthlyKg&&sel.monthlyKg.length>0&&(
            <div style={S.card}>
              <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:10}}>📈 月別収穫量の推移</div>
              {(()=>{
                const data=sel.monthlyKg;
                const maxKg=Math.max(...data.map(d=>d.kg),0.1);
                return <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,paddingBottom:24,position:"relative"}}>
                  {data.map((d,i)=>{
                    const h=Math.round((d.kg/maxKg)*90);
                    const [yy,mm]=d.month.split("-");
                    return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end",minWidth:0}}>
                      <div style={{fontSize:".6rem",color:G,fontWeight:700,marginBottom:2,whiteSpace:"nowrap"}}>{d.kg.toFixed(1)}</div>
                      <div style={{width:"70%",maxWidth:32,height:h+"px",background:"linear-gradient(180deg,#419857,#2d6a3f)",borderRadius:"4px 4px 0 0",minHeight:3}}/>
                      <div style={{fontSize:".58rem",color:TX3,position:"absolute",bottom:0,whiteSpace:"nowrap"}}>{parseInt(mm)}月</div>
                    </div>;
                  })}
                </div>;
              })()}
              <div style={{fontSize:".66rem",color:TX3,textAlign:"right",marginTop:2}}>単位: kg</div>
            </div>
          )}
          {/* ── 積算温度・気象分析ブロック ── */}
          {(()=>{
            const crop=crops.find(c=>c.id===sel.id);
            const db=CDB[crop?.type]||{};
            const gs=gddSettings[sel.id]||{};
            const baseTemp=parseFloat(gs.baseTemp)||10;
            const gddStart=gs.startDate||crop?.plantDate||crop?.sowDate||"";
            // 収穫目安積算温度（品目DB or ユーザー設定）
            const targetGdd=parseFloat(gs.targetGdd)||(db.gdd||null);
            // 収穫目安日数（品目DB or ユーザー設定）
            const targetDays=parseFloat(gs.targetDays)||(()=>{
              const mat=crop?.maturity||"mid";
              return db.maturity?db.maturity[mat]:db.d||null;
            })();

            return <>
              {/* 積算温度設定パネル */}
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showGddConfig?10:0}}>
                  <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e"}}>🌡 積算温度・収穫予測</div>
                  <button onClick={()=>setShowGddConfig(v=>!v)}
                    style={{padding:"3px 10px",borderRadius:8,border:"1px solid #ccc",background:"#fff",fontSize:".72rem",cursor:"pointer",color:"#5c3d1e"}}>
                    {showGddConfig?"▲ 閉じる":"⚙️ 設定"}
                  </button>
                </div>
                {showGddConfig&&(
                  <div style={{background:"#f5efe0",borderRadius:10,padding:"10px 12px",marginBottom:10,display:"grid",gap:8}}>
                    <div>
                      <div style={{fontSize:".72rem",color:TX3,marginBottom:3}}>計算開始日（定植日・受粉日など）</div>
                      <input type="date" value={gddStart}
                        onChange={e=>saveGddSetting(sel.id,{startDate:e.target.value})}
                        style={{...S.inp,fontSize:".82rem"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:".72rem",color:TX3,marginBottom:3}}>基準温度（℃）※デフォルト 10℃</div>
                      <input type="number" value={baseTemp} min={0} max={20}
                        onChange={e=>saveGddSetting(sel.id,{baseTemp:e.target.value})}
                        style={{...S.inp,fontSize:".82rem"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:".72rem",color:TX3,marginBottom:3}}>収穫目標積算温度（℃・日）※空白で日数ベース</div>
                      <input type="number" value={gs.targetGdd||""} placeholder={db.gdd?"品目DB: "+db.gdd:"例: 600"}
                        onChange={e=>saveGddSetting(sel.id,{targetGdd:e.target.value})}
                        style={{...S.inp,fontSize:".82rem"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:".72rem",color:TX3,marginBottom:3}}>収穫目標日数（日）※積算温度が設定済みの場合は補助</div>
                      <input type="number" value={gs.targetDays||""} placeholder={targetDays?"品目DB: "+targetDays+"日":"例: 60"}
                        onChange={e=>saveGddSetting(sel.id,{targetDays:e.target.value})}
                        style={{...S.inp,fontSize:".82rem"}}/>
                    </div>
                  </div>
                )}

                {climateLoading&&<div style={{textAlign:"center",fontSize:".78rem",color:TX3,padding:"12px 0"}}>🌤 気象データ取得中…</div>}

                {climateData&&gddStart&&(()=>{
                  const gddArr=calcGDD(climateData.daily, gddStart, baseTemp);
                  const today=new Date().toISOString().slice(0,10);
                  const currentGdd=gddArr.filter(d=>d.date<=today).slice(-1)[0]?.gdd||0;
                  const totalDays=gddArr.filter(d=>d.date<=today).length;

                  // 収穫予測日（積算温度ベース）
                  let harvestByGdd=null;
                  if(targetGdd) {
                    const hit=gddArr.find(d=>d.gdd>=targetGdd);
                    harvestByGdd=hit?.date||null;
                  }
                  // 収穫予測日（日数ベース）
                  let harvestByDays=null;
                  if(targetDays&&gddStart) {
                    const d=new Date(gddStart);
                    d.setDate(d.getDate()+parseInt(targetDays));
                    harvestByDays=d.toISOString().slice(0,10);
                  }
                  // 予測日を決定（積算温度優先）
                  const harvestPred=harvestByGdd||harvestByDays;
                  const daysToHarvest=harvestPred?Math.round((new Date(harvestPred)-new Date(today))/86400000):null;
                  // GDDグラフ（最大30日分表示）
                  const gddForChart=gddArr.slice(-Math.min(gddArr.length,60));
                  const maxGdd=Math.max(...gddForChart.map(d=>d.gdd),targetGdd||1,1);

                  return <>
                    {/* サマリーカード */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                      {[
                        {v:Math.round(currentGdd)+"℃・日",l:"現在の積算温度",c:"#b45309"},
                        {v:totalDays+"日目",l:gddStart?"開始から":gddStart||"定植からの日数",c:G},
                        {v:harvestPred?(daysToHarvest>0?daysToHarvest+"日後":daysToHarvest===0?"今日!":-daysToHarvest+"日前"):"—",l:"収穫予測",c:harvestPred&&daysToHarvest<=7?"#c0392b":G},
                      ].map((s,i)=>(
                        <div key={i} style={{background:"#f5efe0",borderRadius:10,padding:"7px 6px",textAlign:"center"}}>
                          <div style={{fontSize:"1rem",fontWeight:700,color:s.c,lineHeight:1.2}}>{s.v}</div>
                          <div style={{fontSize:".58rem",color:TX3,marginTop:2}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {harvestPred&&<div style={{background: daysToHarvest<=0?"#fde8e8":daysToHarvest<=14?"#fff8e1":"#e8f5e9",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:".78rem"}}>
                      📅 収穫予測日: <b>{harvestPred}</b>
                      {harvestByGdd&&<span style={{color:TX3}}> （積算温度 {targetGdd}℃・日達成）</span>}
                      {!harvestByGdd&&harvestByDays&&<span style={{color:TX3}}> （定植から {targetDays} 日）</span>}
                      {daysToHarvest!==null&&daysToHarvest<=0&&<b style={{color:"#c0392b"}}> ← 収穫適期！</b>}
                    </div>}
                    {/* GDD推移グラフ */}
                    <div style={{fontSize:".7rem",color:"#b45309",fontWeight:700,marginBottom:4}}>🌡 積算温度（℃・日）の推移</div>
                    <div style={{position:"relative",height:90,marginBottom:4}}>
                      <svg width="100%" height="90" viewBox={"0 0 "+gddForChart.length+" 90"} preserveAspectRatio="none">
                        {/* 目標ライン */}
                        {targetGdd&&<line x1="0" y1={Math.round((1-targetGdd/maxGdd)*80)} x2={gddForChart.length} y2={Math.round((1-targetGdd/maxGdd)*80)} stroke="#c0392b" strokeWidth="0.5" strokeDasharray="2,2"/>}
                        {/* GDD折れ線 */}
                        <polyline
                          points={gddForChart.map((d,i)=>`${i+0.5},${Math.round((1-d.gdd/maxGdd)*80)}`).join(" ")}
                          fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
                        {/* 予測部分（破線） */}
                        {gddForChart.some(d=>d.forecast)&&(()=>{
                          const fi=gddForChart.findIndex(d=>d.forecast);
                          return <polyline
                            points={gddForChart.slice(fi).map((d,i)=>`${fi+i+0.5},${Math.round((1-d.gdd/maxGdd)*80)}`).join(" ")}
                            fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.6"/>;
                        })()}
                      </svg>
                      {/* 目標ラベル */}
                      {targetGdd&&<div style={{position:"absolute",right:0,top:Math.round((1-targetGdd/maxGdd)*80)-16,fontSize:".58rem",color:"#c0392b",background:"rgba(255,255,255,.8)",padding:"1px 4px",borderRadius:4}}>{targetGdd}℃・日</div>}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:".58rem",color:TX3,marginBottom:4}}>
                      <span>{gddForChart[0]?.date.slice(5)}</span>
                      <span>（過去実績 ─── 予測 ----）</span>
                      <span>{gddForChart.slice(-1)[0]?.date.slice(5)}</span>
                    </div>
                    {gddStart&&<div style={{fontSize:".62rem",color:TX3,textAlign:"right"}}>基準温度 {baseTemp}℃ / 開始: {gddStart}</div>}
                  </>;
                })()}

                {!climateData&&!climateLoading&&!gddStart&&(
                  <div style={{color:TX3,fontSize:".78rem",textAlign:"center",padding:"12px 0"}}>
                    ⚙️ 設定から計算開始日を設定してください
                  </div>
                )}
                {!climateData&&!climateLoading&&gddStart&&(
                  <div style={{color:TX3,fontSize:".78rem",textAlign:"center",padding:"12px 0"}}>
                    圃場の住所が設定されていないと気象データを取得できません
                  </div>
                )}
              </div>

              {/* 降雨・日照の過不足 */}
              {climateData&&climateData.monthly&&climateData.monthly.length>0&&(
                <div style={S.card}>
                  <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:10}}>☀️🌧 栽培期間の気象データ（月別）</div>
                  {(()=>{
                    const mData=climateData.monthly;
                    // 品目の必要水分量（CDB.wは週の水やり頻度→月目安降水量換算: w×4×5mm）
                    const needPrecip=db.w?(db.w*4*5):null; // 月目安mm
                    const maxSun=Math.max(...mData.map(d=>d.sunshine),1);
                    const maxPre=Math.max(...mData.map(d=>d.precip),needPrecip||1,1);
                    return <>
                      {/* 日照時間グラフ */}
                      <div style={{fontSize:".72rem",color:"#b45309",fontWeight:700,marginBottom:4}}>☀️ 日照時間（時間/月）</div>
                      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80,marginBottom:12}}>
                        {mData.map((d,i)=>{
                          const h=Math.max(2,Math.round((d.sunshine/maxSun)*70));
                          const [,mm]=d.month.split("-");
                          return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end",minWidth:0}}>
                            <div style={{fontSize:".5rem",color:"#b45309",marginBottom:1,whiteSpace:"nowrap"}}>{Math.round(d.sunshine)}</div>
                            <div style={{width:"80%",height:h+"px",background:"linear-gradient(180deg,#fbbf24,#f59e0b)",borderRadius:"3px 3px 0 0"}}/>
                            <div style={{fontSize:".52rem",color:TX3,marginTop:1,whiteSpace:"nowrap"}}>{parseInt(mm)}月</div>
                          </div>;
                        })}
                      </div>
                      {/* 降水量グラフ */}
                      <div style={{fontSize:".72rem",color:"#1d4ed8",fontWeight:700,marginBottom:4}}>
                        🌧 降水量（mm/月）{needPrecip&&<span style={{fontWeight:400,color:TX3}}> 目安: {needPrecip}mm</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80,position:"relative",marginBottom:4}}>
                        {/* 目安ライン */}
                        {needPrecip&&<div style={{position:"absolute",bottom:Math.round((needPrecip/maxPre)*70),left:0,right:0,borderTop:"1.5px dashed #c0392b",zIndex:1}}/>}
                        {mData.map((d,i)=>{
                          const h=Math.max(2,Math.round((d.precip/maxPre)*70));
                          const [,mm]=d.month.split("-");
                          const over=needPrecip&&d.precip>needPrecip*1.5;
                          const under=needPrecip&&d.precip<needPrecip*0.5;
                          return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end",minWidth:0,position:"relative",zIndex:2}}>
                            <div style={{fontSize:".5rem",color:over?"#1d4ed8":under?"#c0392b":"#1d4ed8",marginBottom:1,whiteSpace:"nowrap",fontWeight:over||under?700:400}}>{Math.round(d.precip)}</div>
                            <div style={{width:"80%",height:h+"px",background:over?"linear-gradient(180deg,#2563eb,#1d4ed8)":under?"linear-gradient(180deg,#fca5a5,#ef4444)":"linear-gradient(180deg,#60a5fa,#3b82f6)",borderRadius:"3px 3px 0 0"}}/>
                            <div style={{fontSize:".52rem",color:TX3,marginTop:1,whiteSpace:"nowrap"}}>{parseInt(mm)}月</div>
                          </div>;
                        })}
                      </div>
                      {/* 過不足コメント */}
                      {needPrecip&&(()=>{
                        const latest=mData.filter(d=>d.month<=new Date().toISOString().slice(0,7)).slice(-1)[0];
                        if(!latest)return null;
                        const ratio=latest.precip/needPrecip;
                        let msg="",color=TX3;
                        if(ratio>1.5){msg=`⚠️ ${latest.month.slice(5)}月は降雨が多め（${Math.round(latest.precip)}mm）。排水・病害リスクに注意。`;color="#1d4ed8";}
                        else if(ratio<0.5){msg=`⚠️ ${latest.month.slice(5)}月は降雨が少なめ（${Math.round(latest.precip)}mm）。追加灌水を検討。`;color="#c0392b";}
                        else{msg=`✅ ${latest.month.slice(5)}月の降水量は適量です（${Math.round(latest.precip)}mm）。`;color=G;}
                        return <div style={{background:"#f5efe0",borderRadius:8,padding:"7px 10px",fontSize:".76rem",color,marginTop:6}}>{msg}</div>;
                      })()}
                      <div style={{fontSize:".62rem",color:TX3,textAlign:"right",marginTop:4}}>出典: Open-Meteo / {fields[crop?.fieldIdx]?.addr||"デフォルト地点"}</div>
                    </>;
                  })()}
                </div>
              )}
            </>;
          })()}

          {/* 費用内訳 */}
          {sel.costTotal>0&&(
            <div style={S.card}>
              <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>💰 費用内訳</div>
              {sel.seedTotal>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                <span>🌱 種・苗代</span><span style={{fontWeight:700}}>{Math.round(sel.seedTotal).toLocaleString()}円</span>
              </div>}
              {sel.fertTotal>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                <span>🌿 施肥費用（使用量計算）</span><span style={{fontWeight:700}}>{Math.round(sel.fertTotal).toLocaleString()}円</span>
              </div>}
              {sel.pestTotal>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                <span>🐛 農薬費用（使用量計算）</span><span style={{fontWeight:700}}>{Math.round(sel.pestTotal).toLocaleString()}円</span>
              </div>}
              {sel.assignedTotal>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                <span>📦 その他割当費用</span><span style={{fontWeight:700}}>{Math.round(sel.assignedTotal).toLocaleString()}円</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:".86rem",fontWeight:700,color:G}}>
                <span>合計</span><span>{Math.round(sel.costTotal).toLocaleString()}円</span>
              </div>
            </div>
          )}

          {/* 施肥・農薬使用量（原液量） */}
          {(Object.keys(sel.fertUse).length>0||Object.keys(sel.pestUse).length>0)&&(
            <div style={S.card}>
              <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:4}}>📊 資材使用量（原液量）</div>
              <div style={{fontSize:".68rem",color:TX3,marginBottom:8}}>液肥・農薬は希釈前の原液量で集計</div>
              {Object.entries(sel.fertUse).map(([name,{amt,unit}])=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                  <span style={{color:"#065f46"}}>🌿 {name}</span>
                  <span style={{fontWeight:700}}>{amt%1===0?amt:amt.toFixed(2)}{unit}</span>
                </div>
              ))}
              {Object.entries(sel.pestUse).map(([name,{amt,unit}])=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                  <span style={{color:"#92400e"}}>🐛 {name}</span>
                  <span style={{fontWeight:700}}>{amt%1===0?amt:amt.toFixed(2)}{unit}</span>
                </div>
              ))}
            </div>
          )}


          {/* 作業種別 */}
          <div style={S.card}>
            <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>作業内訳</div>
            {WORK_TYPES.map(w=>{
              const cnt=dispLogs.filter(l=>l.work===w.value).length;
              const maxW=Math.max(...WORK_TYPES.map(wt=>dispLogs.filter(l=>l.work===wt.value).length),1);
              return cnt>0?(
                <div key={w.value} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <div style={{fontSize:".7rem",minWidth:60,textAlign:"right"}}><Tag type={w.tag}>{w.label}</Tag></div>
                  <div style={{flex:1,background:"#eee",borderRadius:999,height:8,overflow:"hidden"}}><div style={{height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+G+","+G2+")",width:Math.round(cnt/maxW*100)+"%",transition:"width .7s ease"}}/></div>
                  <div style={{fontSize:".68rem",color:TX3,minWidth:26}}>{cnt}回</div>
                </div>
              ):null;
            })}
          </div>

        </>
      ) : (
        <>
          {/* 全体サマリー */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:9}}>
            {[
              {n:totalKg.toFixed(1)+"kg",l:"累計収穫量",c:G},
              {n:Math.round(totalRev).toLocaleString()+"円",l:"累計収益",c:INFO},
              {n:Math.round(totalCost).toLocaleString()+"円",l:"総支出",c:ALERT},
              {n:Math.round(totalRev-totalCost).toLocaleString()+"円",l:"損益",c:totalRev-totalCost>=0?G:ALERT},
              {n:Math.round(commonCost).toLocaleString()+"円",l:"共通費（未割当）",c:WARN},
              {n:totalTimeStr,l:"累計作業時間",c:G},
              {n:crops.length+"品目",l:"栽培品目数",c:G},
            ].map((s,i)=>(
              <div key={i} style={{...S.card,textAlign:"center"}}>
                <div style={{fontSize:"1.5rem",fontWeight:700,color:s.c,lineHeight:1}}>{s.n}</div>
                <div style={{fontSize:".66rem",color:TX3,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* 収益予測 */}
          <div style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showForecast?10:0}}>
              <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",cursor:"pointer",userSelect:"none"}}
                onClick={()=>setShowForecast(p=>!p)}>
                📈 収益予測 <span style={{fontSize:".7rem",color:TX3}}>{showForecast?"▲":"▼"}</span>
              </div>
              {showForecast&&(()=>{
                // 予測合計
                const fcTotal = cropStats.reduce((s,c)=>{
                  const fc = revenueForecasts[c.id]||{};
                  const price = parseFloat(fc.price)||0;
                  const qty   = parseFloat(fc.qty)||0;
                  const times = parseFloat(fc.times)||1;
                  return s + price*qty*times;
                },0);
                const achRate = fcTotal>0 ? Math.round(totalRev/fcTotal*100) : null;
                return (
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:".72rem",color:TX3}}>予測合計</div>
                    <div style={{fontWeight:700,color:INFO,fontSize:".95rem"}}>{Math.round(fcTotal).toLocaleString()}円</div>
                    {achRate!==null&&<div style={{fontSize:".68rem",color:achRate>=100?G:WARN}}>達成率 {achRate}%</div>}
                  </div>
                );
              })()}
            </div>
            {showForecast&&(
              <div>
                <div style={{fontSize:".68rem",color:TX3,marginBottom:8}}>品目ごとに予想単価・収穫量・回数を入力すると目標収益を計算します</div>
                {cropStats.filter(c=>!c.ended).map(c=>{
                  const fc = revenueForecasts[c.id]||{};
                  // 過去の平均単価を計算
                  const hvLogs = logs.filter(l=>l.cropId===c.id&&l.hvPrice&&l.hvKg);
                  const avgPrice = hvLogs.length>0
                    ? Math.round(hvLogs.reduce((s,l)=>{
                        const kg=parseFloat(l.hvKg)||0; const pr=parseFloat(l.hvPrice)||0;
                        return s+kg*pr;
                      },0) / hvLogs.reduce((s,l)=>s+(parseFloat(l.hvKg)||0),0)*10)/10
                    : null;
                  const fcPrice = parseFloat(fc.price)||0;
                  const fcQty   = parseFloat(fc.qty)||0;
                  const fcTimes = parseFloat(fc.times)||1;
                  const fcTotal = fcPrice*fcQty*fcTimes;
                  const achRate = fcTotal>0 ? Math.round(c.rev/fcTotal*100) : null;
                  return (
                    <div key={c.id} style={{borderBottom:"1px solid "+BD,paddingBottom:10,marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <span>{c.emoji}</span>
                        <span style={{fontWeight:700,fontSize:".83rem"}}>{c.name}</span>
                        {fcTotal>0&&<span style={{fontSize:".68rem",color:achRate!==null&&achRate>=100?G:WARN,marginLeft:"auto"}}>
                          達成率 {achRate!==null?achRate+"%":"—"}
                        </span>}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:5}}>
                        <div>
                          <div style={{fontSize:".62rem",color:TX3,marginBottom:2}}>
                            予想単価(円/kg)
                            {avgPrice!==null&&<span style={{marginLeft:4,color:INFO,cursor:"pointer"}}
                              onClick={()=>saveForecast(c.id,{price:String(avgPrice)})}
                              title="過去平均を入力">≈{avgPrice}</span>}
                          </div>
                          <input type="text" inputMode="decimal" value={fc.price||""} placeholder={avgPrice!==null?"≈"+avgPrice:"単価"}
                            onChange={e=>saveForecast(c.id,{price:e.target.value.replace(/[^0-9.]/g,"")})}
                            style={{...S.inp,fontSize:".82rem",padding:"5px 7px"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:".62rem",color:TX3,marginBottom:2}}>予想収穫量(kg)</div>
                          <input type="text" inputMode="decimal" value={fc.qty||""} placeholder="kg"
                            onChange={e=>saveForecast(c.id,{qty:e.target.value.replace(/[^0-9.]/g,"")})}
                            style={{...S.inp,fontSize:".82rem",padding:"5px 7px"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:".62rem",color:TX3,marginBottom:2}}>収穫回数</div>
                          <input type="text" inputMode="decimal" value={fc.times||""} placeholder="1"
                            onChange={e=>saveForecast(c.id,{times:e.target.value.replace(/[^0-9.]/g,"")})}
                            style={{...S.inp,fontSize:".82rem",padding:"5px 7px"}}/>
                        </div>
                      </div>
                      {/* 予測 vs 実績 */}
                      <div style={{display:"flex",gap:8,fontSize:".7rem"}}>
                        <div style={{flex:1,background:"#f0ebe3",borderRadius:6,padding:"5px 8px",textAlign:"center"}}>
                          <div style={{color:TX3,fontSize:".6rem"}}>予測収益</div>
                          <div style={{fontWeight:700,color:INFO}}>{fcTotal>0?Math.round(fcTotal).toLocaleString()+"円":"—"}</div>
                        </div>
                        <div style={{flex:1,background:"#f0ebe3",borderRadius:6,padding:"5px 8px",textAlign:"center"}}>
                          <div style={{color:TX3,fontSize:".6rem"}}>実績収益</div>
                          <div style={{fontWeight:700,color:G}}>{c.rev>0?Math.round(c.rev).toLocaleString()+"円":"—"}</div>
                        </div>
                        <div style={{flex:1,background:"#f0ebe3",borderRadius:6,padding:"5px 8px",textAlign:"center"}}>
                          <div style={{color:TX3,fontSize:".6rem"}}>差額</div>
                          <div style={{fontWeight:700,color:fcTotal>0&&c.rev>=fcTotal?G:ALERT}}>
                            {fcTotal>0?((c.rev-fcTotal>=0?"+":"")+Math.round(c.rev-fcTotal).toLocaleString()+"円"):"—"}
                          </div>
                        </div>
                      </div>
                      {/* 収穫量の進捗バー */}
                      {fcQty>0&&fcTimes>0&&(
                        <div style={{marginTop:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:".62rem",color:TX3,marginBottom:2}}>
                            <span>収穫量進捗</span>
                            <span>{c.kg.toFixed(1)}kg / {(fcQty*fcTimes).toFixed(1)}kg</span>
                          </div>
                          <div style={{background:"#eee",borderRadius:999,height:6,overflow:"hidden"}}>
                            <div style={{height:"100%",borderRadius:999,
                              background:"linear-gradient(90deg,"+G+","+G2+")",
                              width:Math.min(100,Math.round(c.kg/(fcQty*fcTimes)*100))+"%",
                              transition:"width .7s ease"}}/>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {cropStats.filter(c=>!c.ended).length===0&&(
                  <div style={{color:TX3,fontSize:".8rem"}}>栽培中の品目がありません</div>
                )}
              </div>
            )}
          </div>

          {/* 品目別一覧表 */}
          <div style={S.card}>
            <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>📊 品目別 実績</div>
            {cropStats.length===0&&<div style={{color:TX3,fontSize:".82rem"}}>品目が登録されていません</div>}
            {cropStats.filter(c=>!c.ended).map(c=>(
              <div key={c.id} onClick={()=>setSelCropId(c.id)}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:"1px solid "+BD,cursor:"pointer"}}>
                <span style={{fontSize:"1.5rem",opacity:c.ended?.6:1}}>{c.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:".85rem",display:"flex",alignItems:"center",gap:5}}>
                    {c.name}
                    {c.ended&&<span style={{fontSize:".62rem",background:"#e67e22",color:"#fff",borderRadius:999,padding:"1px 6px"}}>終了</span>}
                  </div>
                  <div style={{fontSize:".7rem",color:TX3}}>{c.field} / 作業{c.logCount}件 / {c.timeStr}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:700,fontSize:".88rem",color:G}}>{c.kg.toFixed(1)}kg</div>
                  <div style={{fontSize:".68rem",color:c.profit>=0?G:ALERT}}>{c.profit>=0?"+":""}{Math.round(c.profit).toLocaleString()}円</div>
                </div>
                <div style={{color:TX3,fontSize:".8rem"}}>›</div>
              </div>
            ))}
          </div>

          {/* 栽培終了品目 */}
          {cropStats.filter(c=>c.ended).length>0&&(
            <div style={{...S.card,marginTop:8,opacity:.85}}>
              <div style={{fontSize:".75rem",fontWeight:700,color:"#888",marginBottom:8,paddingBottom:4,borderBottom:"1px solid #f0ebe3"}}>
                栽培終了
              </div>
              {cropStats.filter(c=>c.ended).map(c=>(
                <div key={c.id} onClick={()=>setSelCropId(c.id)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 2px",borderBottom:"1px solid #f8f5ef",cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:".82rem",fontWeight:700,color:"#888"}}>{c.emoji} {c.name}{c.variety?" ("+c.variety+")":""}</div>
                    <div style={{fontSize:".7rem",color:"#bbb"}}>{c.endDate?fmtYMD(c.endDate)+"終了 · ":""}{c.growDays!==null?"栽培"+c.growDays+"日 · ":""}{c.logCount}件 / {c.timeStr}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:700,fontSize:".85rem",color:"#aaa"}}>{c.kg.toFixed(1)}kg</div>
                    <div style={{fontSize:".68rem",color:c.profit>=0?"#aaa":ALERT}}>{c.profit>=0?"+":""}{Math.round(c.profit).toLocaleString()}円</div>
                  </div>
                  <div style={{color:"#ccc",fontSize:".8rem"}}>›</div>
                </div>
              ))}
            </div>
          )}
        {/* 品目ごとの収益性比較 */}
        <div style={S.card}>
          <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>💹 品目別収益性</div>
          {cropStats.length===0&&<div style={{color:TX3,fontSize:".82rem"}}>品目が登録されていません</div>}
          {cropStats.map(c=>{
            const _cr = crops.find(x=>x.id===c.id);
            const area = parseFloat(_cr?.cultivationArea)>0 ? parseFloat(_cr.cultivationArea)/100 : (parseFloat(fields[_cr?.fieldIdx||0]?.area)||0); // a（アール）
            const per10a = area>0 ? Math.round(c.profit/area*10) : null;
            return (
              <div key={c.id} style={{borderBottom:"1px solid "+BD,paddingBottom:8,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:"1.2rem"}}>{c.emoji}</span>
                  <span style={{fontWeight:700,fontSize:".84rem"}}>{c.name}</span>
                  {c.ended&&<span style={{fontSize:".6rem",background:"#e67e22",color:"#fff",borderRadius:999,padding:"1px 5px"}}>終了</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
                  {[
                    {l:"売上",v:Math.round(c.rev).toLocaleString()+"円",c:"#1B5E20"},
                    {l:"費用",v:Math.round(c.costTotal).toLocaleString()+"円",c:"#B71C1C"},
                    {l:"損益",v:(c.profit>=0?"+":"")+Math.round(c.profit).toLocaleString()+"円",c:c.profit>=0?"#1565C0":"#C62828"},
                    {l:"10a損益",v:per10a!=null?(per10a>=0?"+":"")+per10a.toLocaleString()+"円":"—",c:per10a!=null&&per10a>=0?"#2E7D32":"#999"},
                  ].map(x=>(
                    <div key={x.l} style={{background:"#f5f0e8",borderRadius:6,padding:"4px 6px",textAlign:"center"}}>
                      <div style={{fontSize:".6rem",color:TX3,marginBottom:1}}>{x.l}</div>
                      <div style={{fontSize:".72rem",fontWeight:700,color:x.c}}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 労働生産性 */}
        <div style={S.card}>
          <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>⏱️ 労働生産性（時給換算）</div>
          {(()=>{
            const totalMin = cropStats.reduce((s,c)=>s+c.minutes,0);
            const totalRevAll = cropStats.reduce((s,c)=>s+c.rev,0);
            const totalH = totalMin/60;
            const totalHourly = totalH>0 ? Math.round(totalRevAll/totalH) : null;
            return (<>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{flex:1,background:"#E3F2FD",borderRadius:8,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:".64rem",color:"#1565C0",marginBottom:2}}>年間総作業時間</div>
                  <div style={{fontWeight:700,color:"#1565C0"}}>{Math.floor(totalH)}時間{Math.round(totalMin%60)}分</div>
                </div>
                <div style={{flex:1,background:"#E8F5E9",borderRadius:8,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:".64rem",color:"#2E7D32",marginBottom:2}}>全体 時給換算</div>
                  <div style={{fontWeight:700,color:"#2E7D32"}}>{totalHourly!=null?totalHourly.toLocaleString()+"円/h":"—"}</div>
                </div>
              </div>
              {cropStats.filter(c=>c.minutes>0).map(c=>{
                const h=c.minutes/60;
                const hourly=h>0?Math.round(c.rev/h):null;
                return (
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+BD}}>
                    <span>{c.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:".8rem",fontWeight:700}}>{c.name}</div>
                      <div style={{fontSize:".68rem",color:TX3}}>{c.timeStr} / 売上{Math.round(c.rev).toLocaleString()}円</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:700,fontSize:".84rem",color:hourly!=null&&hourly>=1000?"#1B5E20":"#E65100"}}>{hourly!=null?hourly.toLocaleString()+"円/h":"—"}</div>
                    </div>
                  </div>
                );
              })}
              {cropStats.filter(c=>c.minutes>0).length===0&&<div style={{color:TX3,fontSize:".8rem"}}>作業時間の記録がありません</div>}
            </>);
          })()}
        </div>
        </>
      )}

      {/* 品目詳細: 作業記録カード */}


      {sel&&dispLogs.length>0&&(
        <div style={{marginTop:8}}>
          <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".82rem",color:"#5c3d1e",fontWeight:700,marginBottom:8,paddingLeft:2}}>
            📋 作業記録
          </div>
          {(()=>{
            const map={},order=[];
            dispLogs.forEach(l=>{
              const key=l.cropId+':'+l.fieldIdx+':'+l.date+':'+(l.time||'');
              if(!map[key]){map[key]={key,logs:[]};order.push(key);}
              map[key].logs.push(l);
            });
            return order.map(k=>map[k]);
          })().map(card=>{
            const l0=card.logs[0];
            const db=CDB[crops.find(c=>c.id===l0.cropId)?.type]||{};
            const photos=[];
            card.logs.forEach(l=>{[l.imgSrc,l.imgSrc2,l.imgSrc3].forEach(s=>{if(s&&photos.length<3)photos.push(s);});});
            const memoLog=card.logs.find(l=>l.memo);
            const meta=skCardMeta(card.logs);
            return (
              <div key={card.key} style={{...S.card,padding:0,overflow:'hidden',marginBottom:8}}>
                <div style={{padding:'8px 11px'}}>
                  <div style={{fontSize:'.7rem',color:TX3,marginBottom:4,display:'flex',gap:8,flexWrap:'wrap'}}>
                    <span>📅 {fmtYMD(l0.date)}</span>
                    {fields[l0.fieldIdx]?.name&&<span>📍{fields[l0.fieldIdx].name}</span>}
                    {meta.time&&<span>🕐{meta.time}</span>}
                    {meta.duration&&<span>⏱{meta.duration}</span>}
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:4}}>
                    {skCardWorks(card.logs).map(w=>{const wi=skWorkInfo(w);return <span key={w} style={{...S.tag,background:wi.bg,color:wi.fg}}>{wi.icon} {wi.label}</span>;})}
                  </div>
                  {skCardLines(card.logs).map((ln,li)=><div key={li} style={{fontSize:'.75rem',color:ln.color}}>{ln.text}</div>)}
                  {memoLog?.memo&&<div style={{fontSize:'.78rem',color:'#5a5040',marginTop:3,lineHeight:1.5}}>{memoLog.memo}</div>}
                </div>
                {photos.length>0&&(
                  <div style={{display:'grid',gridTemplateColumns:photos.length===1?'1fr':photos.length===2?'1fr 1fr':'1fr 1fr 1fr',gap:2}}>
                    {photos.map((src,i)=>(
                      <img key={i} src={src} alt="" style={{width:'100%',height:photos.length===1?'180px':'110px',objectFit:'cover',display:'block',cursor:'pointer'}}
                        onClick={()=>openLb(photos,i)}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ─── みんなのサクメモ：閲覧数の取得 ───
// farm_views / crop_views = 累計、view_daily = 日別（sakumemo-views.sql 実行後に有効）
const loadPublicStats = async (uid, cropIds) => {
  const out = { farm:null, farmTotal:0, crops:{}, daily:{} };
  if(!uid) return out;
  const since = (()=>{ const d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })();
  const ids = (cropIds||[]).filter(id=>/^[0-9a-f-]{36}$/i.test(String(id)));
  const [farmR, fvR, cvR, vdR] = await Promise.all([
    sb.from("public_farms").select("*").eq("user_id",uid).maybeSingle(),
    sb.from("farm_views").select("view_count,updated_at").eq("user_id",uid).maybeSingle(),
    ids.length ? sb.from("crop_views").select("crop_id,view_count,updated_at").in("crop_id",ids) : Promise.resolve({data:[]}),
    sb.from("view_daily").select("target,day,view_count").eq("farm_user_id",uid).gte("day",since),
  ].map(p=>Promise.resolve(p).catch(e=>({data:null,error:e}))));
  out.farm = farmR?.data || null;
  out.farmTotal = fvR?.data?.view_count || 0;
  out.farmUpdated = fvR?.data?.updated_at || "";
  (cvR?.data||[]).forEach(r=>{ out.crops[r.crop_id] = { total:r.view_count||0, updated:r.updated_at||"" }; });
  (vdR?.data||[]).forEach(r=>{ (out.daily[r.target] = out.daily[r.target]||[]).push({day:r.day, n:r.view_count||0}); });
  out.hasDaily = !vdR?.error;
  return out;
};
const sumDaily = (arr, days) => {
  if(!arr) return 0;
  const d=new Date(); d.setDate(d.getDate()-(days-1));
  const from = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  return arr.filter(x=>x.day>=from).reduce((s,x)=>s+x.n,0);
};
const fmtAgo = iso => {
  if(!iso) return "";
  const m = Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if(isNaN(m)) return "";
  if(m<1) return "たった今"; if(m<60) return m+"分前"; if(m<1440) return Math.floor(m/60)+"時間前";
  return Math.floor(m/1440)+"日前";
};

// ─── 品目ごとの公開設定モーダル ───
function CropPublicModal({ crop, crops, setCrops, fields, uid, stats, onClose, onSaved, showToast }) {
  const farm = stats?.farm || {};
  const [pub,  setPub]  = useState(!!crop.isPublic);
  const [name, setName] = useState(farm.display_name||"");
  const [desc, setDesc] = useState(farm.description||"");
  const [saving, setSaving] = useState(false);
  const cs = stats?.crops?.[crop.id] || {};
  const daily = stats?.daily?.[crop.id];
  const pageUrl = (typeof location!=="undefined"?location.origin:"")+"/farm.html?"+(farm.slug?"u="+farm.slug:"uid="+uid)+"&crop="+crop.id;
  const save = async () => {
    if(pub && !name.trim()){ showToast("農場名を入力してください（公開ページに表示されます）"); return; }
    setSaving(true);
    try{
      const u = {...crop, isPublic:pub};
      const list = crops.map(x=>x.id===u.id?u:x);
      setCrops(list, u, fields);
      const anyPublic = list.some(x=>x.isPublic);
      const { error } = await sb.from("public_farms").upsert({
        user_id:uid, is_public:anyPublic, display_name:name.trim(), description:desc.trim(), updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
      if(error){ console.error("public_farms", error); showToast("公開情報の保存に失敗しました"); setSaving(false); return; }
      showToast(pub ? "「"+getCropName(crop)+"」を公開しました" : "「"+getCropName(crop)+"」を非公開にしました");
      onSaved && onSaved();
      onClose();
    }catch(e){ console.error(e); showToast("保存に失敗しました"); }
    setSaving(false);
  };
  const Stat = ({label, val}) => (
    <div style={{flex:1,textAlign:"center",background:"#fff",borderRadius:8,padding:"8px 4px",border:"1px solid #e8e0d5"}}>
      <div style={{fontSize:"1.05rem",fontWeight:700,color:G}}>{val}</div>
      <div style={{fontSize:".62rem",color:TX3,marginTop:1}}>{label}</div>
    </div>
  );
  return (
    <ModalWithSave open={true} title={"🌐 公開設定："+getCropName(crop)+(crop.variety?"（"+crop.variety+"）":"")} onClose={onClose} onSave={save} saveLabel={saving?"保存中…":"保存"}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"10px 12px",background:pub?"#f0f9f0":"#f5f5f0",borderRadius:10,border:"1px solid "+(pub?"#6ee7b7":BD)}}>
        <div>
          <div style={{fontWeight:700,fontSize:".86rem"}}>{pub?"公開中":"非公開"}</div>
          <div style={{fontSize:".7rem",color:TX3}}>この品目の栽培記録を「みんなのサクメモ」に掲載</div>
        </div>
        <button type="button" onClick={()=>setPub(!pub)} aria-label="公開切り替え"
          style={{width:44,height:26,borderRadius:999,border:"none",cursor:"pointer",background:pub?G:"#ccc",position:"relative",transition:"background .2s",flexShrink:0}}>
          <span style={{position:"absolute",top:3,left:pub?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
        </button>
      </div>
      {pub&&<>
        <FG label="農場名（全品目共通）"><Inp value={name} onChange={setName} placeholder="例：〇〇農園"/></FG>
        <FG label="一言説明（任意・全品目共通）"><Inp value={desc} onChange={setDesc} placeholder="例：静岡県で有機野菜を栽培しています"/></FG>
        <div style={{fontSize:".68rem",color:TX3,marginTop:-4,marginBottom:10,lineHeight:1.5}}>
          公開されるのは作業記録・写真・栽培情報です。費用・売上・在庫は公開されません。
        </div>
      </>}
      <div style={{background:"#f7f5f0",borderRadius:10,padding:"10px 10px 8px",marginBottom:10}}>
        <div style={{fontSize:".76rem",fontWeight:700,color:"#5c3d1e",marginBottom:6}}>👁 この品目の閲覧数（他の人からのアクセス）</div>
        <div style={{display:"flex",gap:6}}>
          <Stat label="累計" val={cs.total||0}/>
          {stats?.hasDaily&&<Stat label="今日" val={sumDaily(daily,1)}/>}
          {stats?.hasDaily&&<Stat label="7日間" val={sumDaily(daily,7)}/>}
          {stats?.hasDaily&&<Stat label="30日間" val={sumDaily(daily,30)}/>}
        </div>
        <div style={{fontSize:".66rem",color:TX3,marginTop:6,lineHeight:1.5}}>
          {cs.updated?"最終閲覧："+fmtAgo(cs.updated)+"　":""}農場ページ全体：累計{stats?.farmTotal||0}回
          {stats?.hasDaily&&"（7日間 "+sumDaily(stats?.daily?.farm,7)+"回）"}<br/>
          ※自分での閲覧は数えません。同じ人の同じ日の再表示は1回として数えます。
        </div>
      </div>
      {crop.isPublic&&farm.is_public&&<div style={{display:"flex",gap:6}}>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer"
          style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:"#f0f9f0",border:"1.5px solid #6ee7b7",borderRadius:10,padding:"9px",textDecoration:"none",color:G,fontWeight:700,fontSize:".78rem"}}>
          🌾 公開ページを見る
        </a>
        <button type="button" onClick={()=>{ try{ navigator.clipboard.writeText(pageUrl).then(()=>showToast("URLをコピーしました")); }catch{ window.prompt("このURLをコピーしてください",pageUrl); } }}
          style={{flex:"0 0 auto",background:"#fff",border:"1.5px solid "+BD,borderRadius:10,padding:"9px 12px",fontSize:".78rem",cursor:"pointer",fontFamily:"inherit",color:"#5a5040"}}>
          🔗 URLコピー
        </button>
      </div>}
    </ModalWithSave>
  );
}

// SETTINGS
function PwChangeSection() {
  const [newPw,   setNewPw]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");
  const submit = async () => {
    if(!newPw||newPw.length<6){setMsg("パスワードは6文字以上");return;}
    if(newPw!==confirm){setMsg("パスワードが一致しません");return;}
    setLoading(true);setMsg("");
    const {error}=await sb.auth.updateUser({password:newPw});
    if(error){setMsg(error.message);}
    else{setMsg("✅ パスワードを変更しました");setNewPw("");setConfirm("");}
    setLoading(false);
  };
  return (
    <div>
      <FG label="新しいパスワード（6文字以上）">
        <div style={{position:"relative"}}>
          <Inp type={showPw?"text":"password"} value={newPw} onChange={setNewPw} placeholder="新しいパスワード"/>
          <button type="button" onClick={()=>setShowPw(p=>!p)}
            style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:".8rem",color:"#888"}}>
            {showPw?"🙈":"👁"}
          </button>
        </div>
      </FG>
      <FG label="パスワード（確認）">
        <Inp type="password" value={confirm} onChange={setConfirm} placeholder="もう一度入力"/>
      </FG>
      {msg&&<div style={{fontSize:".78rem",color:msg.includes("✅")?"#2d6a3f":"#e74c3c",marginBottom:8}}>{msg}</div>}
      <button onClick={submit} disabled={loading}
        style={{width:"100%",padding:"9px",background:loading?"#ccc":G,color:"#fff",border:"none",borderRadius:8,fontSize:".82rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
        {loading?"変更中…":"パスワードを変更"}
      </button>
    </div>
  );
}

function SettingsScreen({ showToast, user, uid, signOut, fields, crops, logs, fertMs, pestMs, equips, costs, setScr, cards=[], setCards, emoney=[], setEmoney }) {
  // ── 祝日カスタマイズ管理 ──
  const [customHolidays, setCustomHolidaysState] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("customHolidays")||"[]"); }catch{ return []; }
  });
  const setCustomHolidays = (arr) => {
    setCustomHolidaysState(arr);
    try{ localStorage.setItem("customHolidays", JSON.stringify(arr)); }catch{}
  };
  const [holidayInput, setHolidayInput] = useState("");   // "YYYY-MM-DD"
  const [holidayNameInput, setHolidayNameInput] = useState(""); // 祝日名
  const [holidayTab, setHolidayTab] = useState("add");    // "add"|"del"
  const [deletedHolidays, setDeletedHolidaysState] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("deletedHolidays")||"[]"); }catch{ return []; }
  });
  const setDeletedHolidays = (arr) => {
    setDeletedHolidaysState(arr);
    try{ localStorage.setItem("deletedHolidays", JSON.stringify(arr)); }catch{}
  };
  const [delInput, setDelInput] = useState("");
  const [kaigyoDate, setKaigyoDateState] = useState(()=>{try{return localStorage.getItem("sakumemo_kaigyo_date")||"";}catch{return "";}});
  const setKaigyoDate = v => { setKaigyoDateState(v); try{localStorage.setItem("sakumemo_kaigyo_date",v);}catch{} syncAppSettings(); };
  const doExport=()=>{ const d=JSON.stringify({fields,crops,logs,fertMs,pestMs,equips,costs},null,2);const a=document.createElement("a");a.href="data:application/json;charset=utf-8,"+encodeURIComponent(d);a.download="farm-ai-export-"+todayStr()+".json";a.click(); };
  const csvEsc=v=>{const s=String(v==null?"":v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const downloadCsv=(rows,name)=>{const bom="\uFEFF";const csv=bom+rows.map(r=>r.map(csvEsc).join(",")).join("\r\n");const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=name+"-"+todayStr()+".csv";a.click();};
  const cropName=id=>{if(!id)return"共通";const c=crops.find(x=>x.id===id);if(!c)return"共通";return getCropName(c)+(c.variety?"("+c.variety+")":"");};
  const workLabel=w=>(WORK_TYPES.find(x=>x.value===w)?.label)||({end:"栽培終了"}[w])||w||"";
  const exportCostCsv=()=>{
    const catLabel=cat=>([...COST_CATS,...INCOME_CATS].find(x=>x.value===cat)?.label||cat||"").replace(/^\S+\s/,"");
    const rows=[["日付","種別","品名","品目","金額","数量","単位","支払方法","メモ"]];
    [...costs].filter(c=>!String(c.cat||"").startsWith("__")).sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(c=>rows.push([c.date||"",catLabel(c.cat)+(c.cancelled?"（取消）":""),c.name||"",cropName(c.cropId),c.amt||"",c.qty||"",c.qunit||"",c.payMethod||"",c.note||""]));
    downloadCsv(rows,"費用一覧");
  };
  const exportLogCsv=()=>{
    const rows=[["日付","時刻","品目","作業","作業時間(分)","天気","メモ"]];
    [...logs].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(l=>rows.push([l.date||"",l.time||"",cropName(l.cropId),workLabel(l.work),l.duration||"",({sunny:"晴れ",cloudy:"曇り",rainy:"雨",snowy:"雪",windy:"強風"}[l.weather]||""),l.memo||""]));
    downloadCsv(rows,"作業記録");
  };
  return (
    <div style={S.scr} className="scr-inner">
      <div style={S.sec}>
        <span>⚙️ 設定</span>
        <button onClick={()=>setScr("home")}
          style={{background:G,border:"none",borderRadius:999,padding:"6px 16px",fontSize:".76rem",fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
          ✕ 閉じる
        </button>
      </div>

      {user && (

      <div style={S.card}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{width:44,height:44,borderRadius:"50%"}}/>}
            <div>
              <div style={{fontWeight:700,fontSize:".9rem"}}>{user.user_metadata?.full_name||""}</div>
              <div style={{fontSize:".74rem",color:TX3}}>{user.email}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{...S.card,fontSize:".76rem",color:TX3,lineHeight:1.6}}>
        🌐 「みんなのサクメモ」への公開設定は、<b>圃場・品目</b>ページの各品目にある「公開設定」ボタンから行えます。
      </div>

      {/* 開業日設定 */}
      {(()=>{
        return (
          <div style={S.card}>
            <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".88rem",color:"#5c3d1e",marginBottom:6}}>🏪 開業日の設定</div>
            <div style={{fontSize:".72rem",color:TX3,marginBottom:10,lineHeight:1.6}}>
              開業日を設定すると、<b>それ以前の費用が「開業費（繰延資産）」</b>として申告タブで区別されます。<br/>
              農機具も開業日以前に購入したものは減価償却明細から除外されます。
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="date" value={kaigyoDate} onChange={e=>setKaigyoDate(e.target.value)}
                style={{...S.inp,flex:1,fontSize:".88rem"}}/>
              {kaigyoDate&&<button onClick={()=>setKaigyoDate("")}
                style={{background:"none",border:"1px solid #e87",borderRadius:6,color:"#c44",fontSize:".72rem",padding:"6px 10px",cursor:"pointer"}}>クリア</button>}
            </div>
            {kaigyoDate&&<div style={{fontSize:".74rem",color:"#2d6a3f",background:"#e6f7ee",borderRadius:6,padding:"6px 10px",marginTop:8}}>
              ✅ {kaigyoDate} より前の費用を「開業費」として扱います
            </div>}
            {!kaigyoDate&&<div style={{fontSize:".72rem",color:"#c07030",marginTop:6}}>
              ⚠️ 未設定：開業費の区別がされません（すべて農業経費として集計）
            </div>}
          </div>
        );
      })()}

      {/* データ管理 */}
      <div style={S.card}>
        <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".88rem",color:"#5c3d1e",marginBottom:10}}>📁 データの保存・書き出し</div>
        <div style={{fontSize:".72rem",color:TX3,marginBottom:10,lineHeight:1.5}}>記録を手元に保存できます。CSVは確定申告や表計算ソフトでの集計に、JSONは全データのバックアップに使えます。</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={exportCostCsv} style={{...S.btn,...S.btnS}}>💰 費用一覧をCSVで書き出す</button>
          <button onClick={exportLogCsv} style={{...S.btn,...S.btnS}}>📝 作業記録をCSVで書き出す</button>
          <button onClick={doExport} style={{...S.btn,...S.btnS}}>💾 全データをバックアップ（JSON）</button>
        </div>
      </div>


      {/* 祝日カスタマイズ */}
      <div style={S.card}>
        <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:G,marginBottom:4}}>🗓️ 祝日カスタマイズ</div>
        <div style={{fontSize:".72rem",color:TX3,marginBottom:10,lineHeight:1.5}}>
          法律改正で祝日が変わった時に対応できます。毎年2月頃に内閣府が翌年分を発表したら、ここで追加・削除してください。
        </div>
        {/* タブ */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {[["add","📅 追加"],["del","🗑️ 削除"]].map(([k,l])=>(
            <button key={k} onClick={()=>setHolidayTab(k)}
              style={{flex:1,padding:"7px 0",border:"none",borderRadius:8,fontWeight:700,fontSize:".8rem",cursor:"pointer",
                background:holidayTab===k?G:"#f0ede6",color:holidayTab===k?"#fff":TX3}}>
              {l}
            </button>
          ))}
        </div>
        {holidayTab==="add"&&<>
          <div style={{fontSize:".76rem",color:TX3,marginBottom:6}}>新しく祝日として追加する日付</div>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input type="date" value={holidayInput} onChange={e=>setHolidayInput(e.target.value)}
              style={{...S.inp,flex:1}}/>
            <input type="text" value={holidayNameInput} onChange={e=>setHolidayNameInput(e.target.value)}
              placeholder="祝日名（例：振替休日）"
              style={{...S.inp,flex:2}}/>
          </div>
          <button style={{...S.btn,...S.btnG}} onClick={()=>{
            if(!holidayInput){showToast("日付を入力してください");return;}
            if(customHolidays.some(h=>h.date===holidayInput)){showToast("すでに登録済みです");return;}
            setCustomHolidays([...customHolidays,{date:holidayInput,name:holidayNameInput||"祝日"}]);
            setHolidayInput(""); setHolidayNameInput("");
            showToast("追加しました");
          }}>＋ 追加</button>
          {customHolidays.length>0&&<>
            <div style={{fontSize:".74rem",color:TX3,marginTop:10,marginBottom:4}}>追加済み祝日</div>
            {[...customHolidays].sort((a,b)=>a.date.localeCompare(b.date)).map((h,i)=>(
              <div key={h.date} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid "+BD}}>
                <div style={{flex:1,fontSize:".8rem"}}>{h.date}<span style={{color:TX3,marginLeft:8}}>{h.name}</span></div>
                <button onClick={()=>{setCustomHolidays(customHolidays.filter(x=>x.date!==h.date));showToast("削除しました");}}
                  style={{background:"none",border:"1px solid #e87",borderRadius:6,color:"#c44",fontSize:".72rem",padding:"2px 8px",cursor:"pointer"}}>削除</button>
              </div>
            ))}
          </>}
        </>}
        {holidayTab==="del"&&<>
          <div style={{fontSize:".76rem",color:TX3,marginBottom:6}}>アルゴリズムで祝日と判定される日を除外する</div>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input type="date" value={delInput} onChange={e=>setDelInput(e.target.value)}
              style={{...S.inp,flex:1}}/>
            <button style={{...S.btn,...S.btnR,width:"auto",padding:"8px 14px"}} onClick={()=>{
              if(!delInput){showToast("日付を入力してください");return;}
              if(deletedHolidays.includes(delInput)){showToast("すでに登録済みです");return;}
              setDeletedHolidays([...deletedHolidays,delInput]);
              setDelInput(""); showToast("除外しました");
            }}>除外</button>
          </div>
          <div style={{fontSize:".72rem",color:"#c07030",marginBottom:8}}>
            ※ 廃止・移動された祝日をここに入れると、その日を平日として扱います
          </div>
          {deletedHolidays.length>0&&<>
            <div style={{fontSize:".74rem",color:TX3,marginBottom:4}}>除外済み日付</div>
            {[...deletedHolidays].sort().map(ds=>(
              <div key={ds} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid "+BD}}>
                <div style={{flex:1,fontSize:".8rem"}}>{ds}</div>
                <button onClick={()=>{setDeletedHolidays(deletedHolidays.filter(x=>x!==ds));showToast("復元しました");}}
                  style={{background:"none",border:"1px solid #8a8",borderRadius:6,color:"#2d6a3f",fontSize:".72rem",padding:"2px 8px",cursor:"pointer"}}>復元</button>
              </div>
            ))}
          </>}
        </>}
      </div>

      {/* ログアウト */}
      <div style={S.card}>
        <Btn style={S.btnR} onClick={signOut}>ログアウト</Btn>
      </div>

      {/* データ管理 */}
      <div style={S.card}>
        <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:10}}>💾 データ管理</div>
        <Btn style={S.btnR} onClick={async()=>{
          if(!window.confirm("全データを削除して退会しますか？\nこの操作は取り消せません。\nSupabaseの全データ・写真も削除されます。"))return;
          try {
            const { data:{ session } } = await sb.auth.getSession();
            const token = session?.access_token||"";
            showToast("削除中…しばらくお待ちください");
            const res = await fetch("/api/delete-account",{
              method:"POST",
              headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+token }
            });
            const d = await res.json();
            if(!res.ok) { showToast("エラー: "+(d.error||"削除できませんでした")); return; }
            ["fa3_fields","fa3_crops","fa3_logs","fa3_fertM","fa3_pestM","fa3_equips","fa3_costs","fa3_chat","sakumemo_key"].forEach(k=>localStorage.removeItem(k));
            showToast("退会しました。データは管理者が保管します。");
            setTimeout(()=>signOut(), 1500);
          } catch(e) { showToast("エラー: "+e.message); }
        }}>🚪 退会・全データ削除</Btn>
      </div>
      <div style={{...S.card,fontSize:".76rem",color:TX3,lineHeight:1.8}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          <a href="https://sakumemo-1.vercel.app/privacy-policy.html" target="_blank"
            style={{background:"#f0f0e8",border:"1px solid #e0d9ce",borderRadius:8,padding:"6px 12px",fontSize:".76rem",color:"#2d6a3f",textDecoration:"none",fontWeight:700}}>
            🔒 プライバシーポリシー
          </a>
          <a href="https://sakumemo-1.vercel.app/terms-of-service.html" target="_blank"
            style={{background:"#f0f0e8",border:"1px solid #e0d9ce",borderRadius:8,padding:"6px 12px",fontSize:".76rem",color:"#2d6a3f",textDecoration:"none",fontWeight:700}}>
            📋 利用規約
          </a>
        </div>
        <div style={{fontSize:".72rem",color:"#a09070"}}>
          お問い合わせ：sakumemo.app@gmail.com
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const SCREENS = [
  { key:"home",    label:"ホーム",     icon:"🏡" },
  { key:"fields",  label:"圃場・品目", icon:"🌾" },
  { key:"plot",    label:"栽培計画",   icon:"📅" },
  { key:"cost",    label:"管理", icon:"📋" },
  { key:"report",  label:"レポート",   icon:"📊" },
];

export default function App() {
  const [user,     setUser]    = useState(null);
  const [offline, setOffline] = useState(typeof navigator!=="undefined" && !navigator.onLine);
  useEffect(()=>{
    const on=()=>setOffline(false), off=()=>setOffline(true);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return ()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);
  const [authLoad, setAuthLoad]= useState(true);
  const [inviteMode, setInviteMode] = useState(false);

  // ブラウザタイトル設定
  useEffect(()=>{ document.title = "サクメモ - 作物の記録アプリ"; },[]);



  // Twemoji: 絵文字をTwitter統一デザインに（render後に適用）
  
  const [dbLoad,   setDbLoad]  = useState(true);
  const [scr,      setScr]     = useState("home");
  // 画面切替時にスクロール位置を先頭へ（描画前に同期実行してちらつきを防ぐ）
  useLayoutEffect(()=>{ const el=document.getElementById("main-scroll"); if(el) el.scrollTop=0; window.scrollTo(0,0); },[scr]);
  const [fields,   setFieldsR] = useState([]);
  const [crops,    setCropsR]  = useState([]);
  const [logs,     setLogsR]   = useState([]);
  const [fertMs,   setFertMsR] = useState([]);
  const [pestMs,   setPestMsR] = useState([]);
  const [equips,   setEquipsR] = useState([]);
  const [costs,    setCostsR]  = useState([]);
  const [plots,    setPlotsR]  = useState([]);
  const [apiKey,   setApiKeyR] = useState(()=>localStorage.getItem("sakumemo_key")||"");
  const [toast,    setToast]   = useState("");
  // クレジットカード設定（localStorage + Supabase同期）
  const [cards, setCardsState] = useState(()=>{
    // sakumemo_cards と creditCards 両方から読み込み（旧キー互換）
    try{
      const v1 = localStorage.getItem('sakumemo_cards');
      if(v1) return JSON.parse(v1);
      const v2 = localStorage.getItem('creditCards');
      if(v2) return JSON.parse(v2);
      return [];
    }catch{ return []; }
  });
  const setCards = (arr) => {
    setCardsState(arr);
    try{ localStorage.setItem('sakumemo_cards', JSON.stringify(arr)); }catch{}
    try{ localStorage.setItem('creditCards', JSON.stringify(arr)); }catch{}
  };
  // 電子マネー設定（localStorage + Supabase同期）
  const [emoney, setEmoneyState] = useState(()=>{
    try{
      const v = localStorage.getItem('sakumemo_emoney');
      if(v) return JSON.parse(v);
      return [];
    }catch{ return []; }
  });
  const setEmoney = (arr) => {
    setEmoneyState(arr);
    try{ localStorage.setItem('sakumemo_emoney', JSON.stringify(arr)); }catch{}
  };
  // Supabaseからクレカ・電子マネー・アプリ設定をロード（クラウドに無ければこの端末の設定を保存）
  useEffect(()=>{
    if(!user?.id) return;
    const loadCfg = (cat, apply, pushLocal) => sb.from("costs").select("*").eq("user_id", user.id).eq("cat",cat).maybeSingle()
      .then(({data, error})=>{
        if(error){ console.warn("設定の読み込み:",cat,error.message); return; }
        let parsed=null; try{ parsed = data?.note ? JSON.parse(data.note) : null; }catch{}
        if(parsed!=null) apply(parsed); else pushLocal();
      });
    loadCfg("__card_cfg", arr=>{
      if(Array.isArray(arr) && arr.length > 0){
        setCardsState(arr);
        try{ localStorage.setItem('sakumemo_cards', JSON.stringify(arr)); }catch{}
        try{ localStorage.setItem('creditCards', JSON.stringify(arr)); }catch{}
      }
    }, ()=>{ const local=(()=>{try{return JSON.parse(localStorage.getItem('sakumemo_cards')||localStorage.getItem('creditCards')||"[]");}catch{return [];}})(); if(local.length) saveCardsToSupabase(local, user.id); });
    loadCfg("__emoney_cfg", arr=>{
      if(Array.isArray(arr) && arr.length > 0){
        setEmoneyState(arr);
        try{ localStorage.setItem('sakumemo_emoney', JSON.stringify(arr)); }catch{}
      }
    }, ()=>{ const local=(()=>{try{return JSON.parse(localStorage.getItem('sakumemo_emoney')||"[]");}catch{return [];}})(); if(local.length) saveEmoneyToSupabase(local, user.id); });
    APP_SETTINGS_UID = user.id;
    loadCfg("__app_cfg", obj=>applyAppSettings(obj), ()=>applyAppSettings(null));
  },[user?.id]);
  const saveCardsToSupabase = (arr, uid) => {
    if(!uid) return;
    const id = cfgRowId(uid,1);
    dbUpsert("costs", {
      id, user_id: uid, cat: "__card_cfg",
      name: "__card_settings", note: JSON.stringify(arr),
      amt: "0", date: null, field_id: null, crop_id: null,
      qty: null, qunit: null, master_id: null, work: null,
      pay_method: null, pay_date: null, cancelled: false
    });
  };
  const saveEmoneyToSupabase = (arr, uid) => {
    if(!uid) return;
    const id = cfgRowId(uid,2);
    dbUpsert("costs", {
      id, user_id: uid, cat: "__emoney_cfg",
      name: "__emoney_settings", note: JSON.stringify(arr),
      amt: "0", date: null, field_id: null, crop_id: null,
      qty: null, qunit: null, master_id: null, work: null,
      pay_method: null, pay_date: null, cancelled: false
    });
  };
  const setCardsAndSync = (arr) => {
    setCards(arr);
    saveCardsToSupabase(arr, user?.id);
  };
  const setEmoneyAndSync = (arr) => {
    setEmoney(arr);
    saveEmoneyToSupabase(arr, user?.id);
  };
  // ── 日本の祝日をアルゴリズムで計算（年限なし・2028年以降も対応） ──
  const dateToStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };
  // 春分日・秋分日の概算（天文計算式）
  const shunbun = (y) => {
    if(y<=1979) return Math.floor(20.8357 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
    if(y<=2099) return Math.floor(20.8431 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
    return Math.floor(21.851 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
  };
  const shubun = (y) => {
    if(y<=1979) return Math.floor(23.2588 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
    if(y<=2099) return Math.floor(23.2488 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
    return Math.floor(24.2488 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
  };
  // 第n月曜（ハッピーマンデー）
  const nthMon = (y, m, n) => {
    const first = new Date(y, m-1, 1);
    const dow = first.getDay(); // 0=日
    const delta = (1 - dow + 7) % 7; // 最初の月曜までの日数
    return 1 + delta + (n-1)*7;
  };
  // 年ごとの祝日セットを生成
  const buildHolidays = (y) => {
    const h = new Set();
    const add = (m, d) => { if(d>=1&&d<=31) h.add(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`); };
    add(1,1);              // 元日
    add(1, nthMon(y,1,2)); // 成人の日
    add(2,11);             // 建国記念の日
    add(2,23);             // 天皇誕生日（2020〜）
    const sp = shunbun(y);
    add(3, sp);            // 春分の日
    add(4,29);             // 昭和の日
    add(5,3);add(5,4);add(5,5); // 憲法・みどり・こどもの日
    add(7, nthMon(y,7,3)); // 海の日
    add(8,11);             // 山の日
    add(9, nthMon(y,9,3)); // 敬老の日
    const au = shubun(y);
    add(9, au);            // 秋分の日
    add(10, nthMon(y,10,2)); // スポーツの日
    add(11,3);             // 文化の日
    add(11,23);            // 勤労感謝の日
    // 振替休日（日曜の翌月曜）と国民の休日（祝日に挟まれた平日）
    const dates = [...h].sort();
    const extra = new Set();
    dates.forEach(ds => {
      const d2 = new Date(ds);
      if(d2.getDay()===0){ // 日曜→翌月曜
        const next = new Date(d2); next.setDate(next.getDate()+1);
        while(h.has(dateToStr(next))||extra.has(dateToStr(next))){ next.setDate(next.getDate()+1); }
        extra.add(dateToStr(next));
      }
    });
    // 国民の休日（祝日と祝日に挟まれた平日）
    [...dates,...[...extra]].sort().forEach((ds,i,arr)=>{
      if(i===0) return;
      const prev = new Date(arr[i-1]); const curr = new Date(ds);
      const diff = (curr-prev)/86400000;
      if(diff===2){
        const mid = new Date(prev); mid.setDate(mid.getDate()+1);
        if(mid.getDay()!==0&&mid.getDay()!==6) extra.add(dateToStr(mid));
      }
    });
    extra.forEach(ds=>h.add(ds));
    return h;
  };
  // カスタム祝日データ（SettingsScreenで編集 → localStorage経由で参照）
  const getCustomHolidays = () => { try{ return JSON.parse(localStorage.getItem("customHolidays")||"[]"); }catch{ return []; } };
  const getDeletedHolidays = () => { try{ return JSON.parse(localStorage.getItem("deletedHolidays")||"[]"); }catch{ return []; } };
  // 祝日判定キャッシュ（カスタムデータを反映）
  const _holidayCache = {};
  const isJpHoliday = (d) => {
    const ds = dateToStr(d);
    // 除外リストに入っていれば祝日ではない
    if(getDeletedHolidays().includes(ds)) return false;
    // カスタム追加リストに入っていれば祝日
    if(getCustomHolidays().some(h=>h.date===ds)) return true;
    // アルゴリズム判定
    const y = d.getFullYear();
    if(!_holidayCache[y]) _holidayCache[y] = buildHolidays(y);
    return _holidayCache[y].has(ds);
  };
  // 銀行の休業日：土日・祝日・年末年始（12/31〜1/3）
  const isNonBiz = (d) => d.getDay()===0 || d.getDay()===6 || isJpHoliday(d) || (d.getMonth()===11&&d.getDate()===31) || (d.getMonth()===0&&d.getDate()<=3);
  const nextBizDay = (d) => {
    let r = new Date(d);
    while(isNonBiz(r)) r.setDate(r.getDate()+1);
    return r;
  };
  const prevBizDay = (d) => {
    let r = new Date(d);
    while(isNonBiz(r)) r.setDate(r.getDate()-1);
    return r;
  };
  // カードの引き落とし予定日を計算
  const calcPayDate = (purchaseDate, card) => {
    if(!purchaseDate||!card) return "";
    const [py, pm, pd2] = purchaseDate.split("-").map(Number);
    // 末日は 31（または0・空欄）で指定。28〜30日は月末扱いにせず、その日（短い月は月末）を使う
    const _cd = parseInt(card.closingDay); const closeDay = (!_cd || _cd>=31) ? 31 : _cd;
    const _pd = parseInt(card.payDay);     const payDay   = (card.payDay===""||card.payDay==null||isNaN(_pd)) ? 27 : ((_pd===0||_pd>=31) ? 31 : _pd);
    const payNext  = parseInt(card.payNext)||1; // 翌月=1, 翌々月=2
    // 休日処理モード: "next"=翌営業日(デフォ), "prev"=前営業日, "none"=そのまま
    const holidayMode = card.holidayMode || "next";
    const lastDayOfBuyMonth = new Date(py, pm, 0).getDate();
    const closeActual = Math.min(closeDay, lastDayOfBuyMonth);
    let payMonthOffset = payNext;
    if(pd2 > closeActual) payMonthOffset = payNext + 1;
    const payMonthDate = new Date(py, pm - 1 + payMonthOffset, 1);
    const payY = payMonthDate.getFullYear();
    const payM = payMonthDate.getMonth();
    const lastDayOfPayMonth = new Date(payY, payM+1, 0).getDate();
    const payActual = Math.min(payDay, lastDayOfPayMonth);
    let result = new Date(payY, payM, payActual);
    if(holidayMode==="next" && isNonBiz(result)) result = nextBizDay(result);
    else if(holidayMode==="prev" && isNonBiz(result)) result = prevBizDay(result);
    return dateToStr(result);
  };
  const [lb, setLb] = useState(null); // ライトボックス {photos:[], idx:0}
  const openLb = (photos, idx) => {
    document.body.classList.add('lb-open');
    setLb({photos, idx});
  };
  const closeLb = () => {
    document.body.classList.remove('lb-open');
    setLb(null);
  };
  const [initWork,     setInitWork]    = useState("");
  const [initLog,      setInitLog]     = useState(null);
  const [initLogs,     setInitLogs]    = useState([]);   // 複数作業編集用
  const [logModal,     setLogModal]    = useState(false);
  const logScreenSaveRef = useRef(null); // LogScreenのdoSave参照
  const [pendingEditCrop, setPendingEditCrop] = useState(null); // ホームから品目編集
  const toastTimer = useRef(null);
  const showToast = msg => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(""),2400); };

  // グローバルキーボードショートカット
  useEffect(()=>{
    const onKey = e => {
      // モーダルやテキスト入力中は無視
      const tag = document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
      if(logModal) {
        // logModal内: ESC→閉じる, Shift+S→保存
        if(e.key==="Escape"){ e.preventDefault(); setLogModal(false); return; }
        if(e.shiftKey&&e.key==="S"){ e.preventDefault(); logScreenSaveRef.current&&logScreenSaveRef.current(); return; }
        return;
      }
      // グローバル画面切替
      if(e.key==="n"||e.key==="N"){ e.preventDefault(); setInitLog(null);setLogModal(true); return; }
      if(e.key==="h"||e.key==="H"){ e.preventDefault(); setScr("home"); return; }
      if(e.key==="t"||e.key==="T"){ e.preventDefault(); setScr("log"); return; }
      if(e.altKey){
        if(e.key==="1"){ e.preventDefault(); setScr("home"); return; }
        if(e.key==="2"){ e.preventDefault(); setScr("fields"); return; }
        if(e.key==="3"){ e.preventDefault(); setScr("log"); return; }
        if(e.key==="4"){ e.preventDefault(); setScr("cost"); return; }
        if(e.key==="5"){ e.preventDefault(); setScr("report"); return; }
      }
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[logModal]);

  // Auth
  useEffect(()=>{
    const {data:{subscription}}=sb.auth.onAuthStateChange((event, session)=>{
      if(event==='PASSWORD_RECOVERY'){
        setInviteMode(true);
        setUser(null);
        setAuthLoad(false);
        return;
      }
      const hash = window.location.hash;
      if(hash.includes('error=access_denied')||hash.includes('otp_expired')){
        window.__linkError='リンクの有効期限が切れています。もう一度お試しください。';
        window.history.replaceState(null,'',window.location.pathname);
        setUser(null);
        setAuthLoad(false);
        return;
      }
      setUser(session?.user??null);
      setAuthLoad(false);
    });
    // バックグラウンド復帰時
    const onVisible=()=>{
      if(document.visibilityState==='visible'){
        sb.auth.getSession().then(({data:{session}})=>{
        const next=session?.user??null;
        setUser(prev=>{
          // IDが同じなら参照を更新しない（[user]useEffectの無駄な再実行・再ロード防止）
          if(prev?.id && next?.id && prev.id===next.id) return prev;
          return next;
        });
      });
      }
    };
    document.addEventListener('visibilitychange',onVisible);
    return ()=>{
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[]);

  // Load from Supabase
  useEffect(()=>{
    if(!user)return;
    setDbLoad(true);
    const uid=user.id;
    Promise.all([dbFetch("fields",uid),dbFetch("crops",uid),dbFetch("logs",uid),dbFetch("fert_masters",uid),dbFetch("pest_masters",uid),dbFetch("equipments",uid),dbFetch("costs",uid),dbFetch("plots",uid)]).then(([f,c,l,fm,pm,eq,co,pl])=>{
        const rawF=f.map(fieldFromDb);
      const rawC=c.map(r=>cropFromDb(r,rawF));
      const rawL=l.map(r=>logFromDb(r,rawF));
      setFieldsR(rawF);setCropsR(rawC);setLogsR(rawL);
      setFertMsR(fm.map(fertMFromDb));setPestMsR(pm.map(pestMFromDb));
      setEquipsR(eq.map(equipFromDb));const _costs=co.filter(r=>!String(r.cat||"").startsWith("__")).map(r=>costFromDb(r,rawF));setCostsR(_costs);
      try{
        const _r=JSON.parse(localStorage.getItem("apportionRates")||"{}");
        _costs.forEach(c=>{
          if(c.apportionRate!==undefined) _r[c.id]=c.apportionRate;
          else if(_r[c.id]!==undefined && Number(_r[c.id])<100){ c.apportionRate=Number(_r[c.id]); dbSaveCost(c); } // この端末だけにあった按分率をDBへ移行
        });
        localStorage.setItem("apportionRates",JSON.stringify(_r));
      }catch{}setPlotsR((pl||[]).map(plotFromDb));
      setDbLoad(false);
    }).catch(e=>console.error("LOAD ERROR:", e));
  },[user]);

  const uid=user?.id;

  // ── DB保存ヘルパー（1件だけ保存・非同期） ──
  const dbSaveField = o => { if(!uid) return; const item = {...o, id:o.id||uid0()}; dbUpsert("fields", fieldToDb(item, uid)); return item; };
  const dbSaveCrop  = (o, flds) => { if(!uid) return; const fId = (flds||fields)[o.fieldIdx]?.id || o.fieldId || null; dbUpsert("crops", cropToDb({...o, fieldId:fId}, uid)); };
  const dbSaveLog   = o => { if(!uid){console.error('dbSaveLog: no uid');return Promise.resolve();} return dbUpsert("logs", logToDb(o, uid, fields)); };
  const dbSaveFertM = o => { if(!uid){console.error("dbSaveFertM: no uid");return;} dbUpsert("fert_masters", fertMToDb(o, uid)).catch(e=>console.error("fertM save err:",e)); };
  const dbSavePestM = o => { if(!uid) return; dbUpsert("pest_masters", pestMToDb(o, uid)); };
  const dbSaveEquip = o => { if(!uid) return; dbUpsert("equipments",   equipToDb(o, uid)); };
  const dbSaveCost  = o => {
    if(!uid) return;
    const row = costToDb(o, uid, fields);
    dbUpsert("costs", row);
  };
  const dbSavePlot  = o => { if(!uid) return; dbUpsert("plots", plotToDb(o, uid)); };

  // ── State + DB同期（UIは即時更新・DB保存はバックグラウンド） ──
  const setFields = (arr, item) => { setFieldsR(arr); if(item) dbSaveField(item); };
  const setCrops  = (arr, item, flds) => { setCropsR(arr); if(item) dbSaveCrop(item, flds); };
  const setLogs   = (arr, item) => { setLogsR(arr); if(item) dbSaveLog(item); };
  const setFertMs = (arr, item) => { setFertMsR(arr); if(item) dbSaveFertM(item); };
  const setPestMs = (arr, item) => { setPestMsR(arr); if(item) dbSavePestM(item); };
  const setEquips = (arr, item) => { setEquipsR(arr); if(item) dbSaveEquip(item); };
  const setCosts  = (arr, item) => { setCostsR(arr); if(item) dbSaveCost(item); };
  const setPlots  = (arr, item) => { setPlotsR(arr); if(item) dbSavePlot(item); };
  const setApiKey = v => { setApiKeyR(v); localStorage.setItem("sakumemo_key",v); };

  const signOut=async()=>{ await sb.auth.signOut(); setUser(null);setFieldsR([]);setCropsR([]);setLogsR([]);setFertMsR([]);setPestMsR([]);setEquipsR([]);setCostsR([]);setPlotsR([]); };

  const TITLES={home:"作物の記録アプリ",fields:"圃場・品目管理",plot:"栽培計画",log:"作業記録",cost:"管理",report:"分析レポート",settings:"設定"};

  const loading_screen = bg => <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100svh",background:"linear-gradient(135deg,"+GD+","+G+")"}}><style>{globalCss}</style><div style={{color:"#fff",textAlign:"center"}}><div style={{fontSize:"2rem",marginBottom:10}}>🌾</div><div>{bg}</div></div></div>;

  if(authLoad) return loading_screen("読み込み中…");
  if(inviteMode) return <SetPasswordScreen onDone={()=>setInviteMode(false)}/>;
  if(!user)    return <LoginScreen/>;
  // dbLoad中は前の画面を薄くして表示（読込中でも操作可能）
  // → loading_screen を使わずにオーバーレイで表示

  return (
    <div id="app-root" style={S.app}>
      <style>{globalCss}</style>
      <div id="top-bar" style={S.topbar}>
        <span style={{fontSize:"1.3rem"}}>🌾</span>
        <span style={S.logo}>サクメモ</span>
        <span style={{fontSize:".68rem",opacity:.58,flex:1,marginLeft:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{TITLES[scr]||""}</span>
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
          <button style={S.tbBtn} onClick={()=>{const el=document.getElementById("main-scroll");if(el)el.scrollTop=0;setScr("settings");}}>⚙️</button>
          <button style={S.tbBtn} onClick={signOut}>ログアウト</button>
        </div>
      </div>
      {offline && (
        <div style={{background:"#856404",color:"#fff",fontSize:".72rem",textAlign:"center",padding:"4px 8px",flexShrink:0}}>
          📡 オフライン中：表示は可能ですが、保存はオンライン復帰後に行ってください
        </div>
      )}
      {/* PC horizontal tab nav - hidden on mobile via CSS */}
      <div id="pc-nav" style={{display:"none",background:GD,width:"100%",flexShrink:0,overflowX:"auto"}}>
        <div style={{display:"flex",gap:0,minWidth:"max-content"}}>
          {SCREENS.map(s=>(
            <button key={s.key} onClick={()=>{if(s.key!=="fields")setPendingEditCrop(null);setScr(s.key);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:"none",border:"none",
                color:scr===s.key?"#9ffcb4":"rgba(255,255,255,.55)",
                borderBottom:scr===s.key?"2px solid #9ffcb4":"2px solid transparent",
                fontSize:".78rem",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              <span style={{fontSize:"1rem"}}>{s.icon}</span>{s.label}
            </button>
          ))}
          <button onClick={()=>setScr("settings")}
            style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:"none",border:"none",
              color:scr==="settings"?"#9ffcb4":"rgba(255,255,255,.55)",
              borderBottom:scr==="settings"?"2px solid #9ffcb4":"2px solid transparent",
              fontSize:".78rem",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            <span style={{fontSize:"1rem"}}>⚙️</span>設定
          </button>
        </div>
      </div>
      <div id="main-scroll" style={S.main}>
        {scr==="fields"  &&<FieldsScreen  fields={fields} setFields={setFields} setFieldsR={setFieldsR} crops={crops} setCrops={setCrops} setCropsR={setCropsR} costs={costs} setCosts={setCosts} logs={logs} setLogs={setLogs} setLogsR={setLogsR} plots={plots} setPlots={setPlots} setPlotsR={setPlotsR} showToast={showToast} editCrop={pendingEditCrop} uid={uid}/>}
        {(scr==="log"||scr==="home") && <><HomeScreen fields={fields} crops={crops} setCrops={setCrops} logs={logs} costs={costs} showToast={showToast} setScr={setScr} dbLoad={dbLoad} onEditCrop={c=>{setPendingEditCrop(c);setScr("fields");}} onNew={()=>{setInitLog(null);setLogModal(true);}} setLogs={setLogs} dbSaveLog={dbSaveLog} dbDelete={dbDelete}/><TimelineScreen fields={fields} crops={crops} equips={equips} logs={logs} setLogs={setLogs} setLogsR={setLogsR} showToast={showToast} openLb={openLb} pestMs={pestMs} fertMs={fertMs} setFertMs={setFertMs} setPestMs={setPestMs}
        onEdit={ls=>{const _ls=Array.isArray(ls)?ls:[ls];const _sorted=[..._ls].sort((a,b)=>(a.imgSrc?-1:0)-(b.imgSrc?-1:0));setInitLogs(_ls);setInitLog(_sorted[0]);setLogModal(true);}}
        onNew={()=>{setInitLog(null);setLogModal(true);}}
        onCopy={ls=>{
          // IDをリセットして新規として複製（写真・日付はリセット）
          const _ls=Array.isArray(ls)?ls:[ls];
          const copied=_ls.map(l=>({...l,id:null,imgSrc:null,imgSrc2:null,imgSrc3:null}));
          // memoを持つlogを探してcoped[0]にマージ
          const memoLog=_ls.find(l=>l.memo);
          const base={...copied[0],_isCopy:true};
          if(memoLog&&!base.memo) base.memo=memoLog.memo;
          setInitLogs(copied);setInitLog(base);setLogModal(true);
          showToast('記録をコピーしました。内容を確認して保存してください');
        }}
      /></>}
        
        {scr==="plot"    &&<PlanScreen    fields={fields} crops={crops} setCrops={setCrops} plots={plots} setPlots={setPlots} setPlotsR={setPlotsR} showToast={showToast} setScr={setScr}/>}
        {scr==="cost"    &&<CostScreen    fields={fields} crops={crops} fertMs={fertMs} setFertMs={setFertMs} pestMs={pestMs} setPestMs={setPestMs} equips={equips} setEquips={setEquips} costs={costs} setCosts={setCosts} logs={logs} showToast={showToast} cards={cards} setCards={setCardsAndSync} emoney={emoney} setEmoney={setEmoneyAndSync} calcPayDate={calcPayDate} user={user}/>}

        {scr==="report"  &&<ReportScreen  fields={fields} crops={crops} logs={logs} costs={costs} fertMs={fertMs} pestMs={pestMs} equips={equips} openLb={openLb}/>}
        {scr==="settings"&&<SettingsScreen showToast={showToast} user={user} uid={uid} signOut={signOut} fields={fields} crops={crops} logs={logs} fertMs={fertMs} cards={cards} setCards={setCardsAndSync} emoney={emoney} setEmoney={setEmoneyAndSync} pestMs={pestMs} equips={equips} costs={costs} setScr={setScr}/>}
      </div>
      {/* ライトボックス */}
      {lb&&<div onClick={closeLb} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.92)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',touchAction:'pinch-zoom',overflow:'hidden'}}>
        {/* 閉じるボタン */}
        <button onClick={closeLb} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:40,height:40,borderRadius:'50%',fontSize:'1.2rem',cursor:'pointer',zIndex:10000}}>✕</button>
        {/* 前へ */}
        {lb.photos.length>1&&<button onClick={e=>{e.stopPropagation();setLb(l=>({...l,idx:(l.idx-1+l.photos.length)%l.photos.length}));}} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:44,height:44,borderRadius:'50%',fontSize:'1.5rem',cursor:'pointer',zIndex:10000}}>‹</button>}
        {/* 画像 */}
        <img src={lb.photos[lb.idx]} alt="" style={{maxWidth:'94vw',maxHeight:'88vh',objectFit:'contain',borderRadius:8,boxShadow:'0 4px 32px rgba(0,0,0,.5)',touchAction:'pinch-zoom',WebkitUserSelect:'none',userSelect:'none'}}/>
        {/* 次へ */}
        {lb.photos.length>1&&<button onClick={e=>{e.stopPropagation();setLb(l=>({...l,idx:(l.idx+1)%l.photos.length}));}} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:44,height:44,borderRadius:'50%',fontSize:'1.5rem',cursor:'pointer',zIndex:10000}}>›</button>}
        {/* カウンター */}
        {lb.photos.length>1&&<div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',color:'rgba(255,255,255,.7)',fontSize:'.78rem'}}>{lb.idx+1} / {lb.photos.length}</div>}
      </div>}

      <nav id="bot-nav" style={S.bnav}>
        {SCREENS.map(s=>(
          <button key={s.key} onClick={()=>{if(s.key!=="fields")setPendingEditCrop(null);setScr(s.key);}} style={s.key==="log"?S.bBtn:scr===s.key?S.bBtnOn:S.bBtn}>
            <span style={{fontSize:"1.1rem",lineHeight:1}}>{s.icon}</span>{s.label}
          </button>
        ))}
      </nav>
      {/* 作業記録モーダル - 常にDOMに存在させて入力内容を保持 */}
      {logModal&&<div className="app-modal" style={{position:"fixed",left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:960,bottom:0,zIndex:9999,background:"#f8f5ef",display:"flex",flexDirection:"column"}}>
          <div style={{background:GD,color:"#fff",padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <span style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".92rem",fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{initLog?"✏️ 作業を編集":"📝 記録する"}</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setLogModal(false);}} style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:".8rem",cursor:"pointer",flexShrink:0,minWidth:40,minHeight:40}}>✕</button>
              <button onClick={()=>logScreenSaveRef.current&&logScreenSaveRef.current()}
                style={{background:"#fff",border:"none",color:G,borderRadius:8,padding:"6px 14px",fontSize:".8rem",fontWeight:700,cursor:"pointer",flexShrink:0,minWidth:60,minHeight:40}}>
                保存 ✓
              </button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <LogScreen key={(initLog?._isCopy?"copy-"+(initLog?.cropId||""):initLog?.id||"new")+String(logModal)} saveRef={logScreenSaveRef} uid={uid} fields={fields} crops={crops} setCrops={setCrops} fertMs={fertMs} setFertMs={setFertMs} pestMs={pestMs} setPestMs={setPestMs} equips={equips} costs={costs} setCosts={setCosts} logs={logs} setLogs={setLogs} dbSaveLog={dbSaveLog} setLogsR={setLogsR} showToast={showToast} initialWork={initWork} editLog={initLog} editLogs={initLogs} onDone={()=>{setLogModal(false);}}/>
          </div>
        </div>}
      {dbLoad && (
        <div style={{position:"fixed",top:0,left:0,right:0,height:3,zIndex:9998,background:"linear-gradient(90deg,"+G+","+G2+")",animation:"loading 1.5s ease-in-out infinite"}}/>
      )}
      <Toast msg={toast}/>
      {/* 全画面共通: トップに戻るボタン */}
      <button
        onClick={()=>{const el=document.getElementById('main-scroll');if(el)el.scrollTo({top:0,behavior:'smooth'});}}
        style={{position:'fixed',bottom:'calc(72px + env(safe-area-inset-bottom))',right:14,width:38,height:38,borderRadius:'50%',
          background:G,color:'#fff',border:'none',fontSize:'1rem',cursor:'pointer',
          boxShadow:'0 2px 8px rgba(0,0,0,.3)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',
          opacity:.85}}>↑</button>
    </div>
  );
}
