import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://nlamtphkwdoxtjktkjzo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYW10cGhrd2RveHRqa3RranpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODI3NzYsImV4cCI6MjA5MzM1ODc3Nn0.8gba30xxu0s132vg_xOA6-Y3XWjR1YhaprIgUYHZO0o"
);

// DB helpers
const dbFetch = async (table, uid) => {
  const { data, error } = await sb.from(table).select("*").eq("user_id", uid).order("created_at");
  if (error) {
    console.error("DB fetch error:", table, error.code, error.message);
    return [];
  }
  return data || [];
};
const dbUpsert = async (table, row) => {
  const { data, error } = await sb.from(table).upsert(row, { onConflict: "id" }).select();
  if (error) {
    console.error("DB保存エラー:", table, error.code, error.message, JSON.stringify(error));
  } else {
    }
};
const dbDelete = async (table, id) => {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error("delete", table, error.message);
};

// Converters
const fieldToDb   = (o, uid) => ({ id:o.id, user_id:uid, name:o.name||"", area:o.area||null, soil:o.soil||null, addr:o.addr||null, memo:o.memo||null, prefecture:o.prefecture||null });
const fieldFromDb = r => ({ id:r.id, name:r.name||"", area:r.area||"", soil:r.soil||"", addr:r.addr||"", memo:r.memo||"", prefecture:r.prefecture||"" });
const cropToDb    = (o, uid) => ({ id:o.id, user_id:uid, field_id:o.fieldId||null, type:o.type||null, variety:o.variety||null, germ_rate:o.germRate||null, stocks:o.stocks||null, ridge_w:o.ridgeW||null, ridge_h:o.ridgeH||null, rows:o.rows||null, row_space:o.rowSpace||null, plant_space:o.plantSpace||null, sow_date:o.sowDate||null, plant_date:o.plantDate||null, memo:o.memo||null, cultivation_type:o.cultivationType||null, seed_cost:o.seedCost||null, seed_note:o.seedNote||null, custom_name:o.customName||null, ended:o.ended||false, end_date:o.endDate||null, maturity:o.maturity||null, custom_days:o.customDays||null, custom_water:o.customWater||null, pot_size:o.potSize||null, pot_volume:o.potVolume||null, pot_count:o.potCount||null, grow_env:o.growEnv||null, agri_month_start:o.agriMonthStart||null, ridge_len:o.ridgeLen||null, cultivation_area:o.cultivationArea||null, temp_min:o.tempMin||null, temp_max:o.tempMax||null });
const cropFromDb  = (r, fields) => { const fi = fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, type:r.type||"", variety:r.variety||"", germRate:r.germ_rate||"", stocks:r.stocks||"", ridgeW:r.ridge_w||"", ridgeH:r.ridge_h||"", rows:r.rows||"", rowSpace:r.row_space||"", plantSpace:r.plant_space||"", sowDate:r.sow_date||"", plantDate:r.plant_date||"", memo:r.memo||"", cultivationType:r.cultivation_type||"transplant", seedCost:r.seed_cost||"", seedNote:r.seed_note||"", customName:r.custom_name||"", ended:r.ended||false, endDate:r.end_date||"", maturity:r.maturity||"mid", customDays:r.custom_days||"", customWater:r.custom_water||"", potSize:r.pot_size||"", potVolume:r.pot_volume||"", potCount:r.pot_count||"", growEnv:r.grow_env||"field", agriMonthStart:r.agri_month_start||"", ridgeLen:r.ridge_len||"", cultivationArea:r.cultivation_area||"", tempMin:r.temp_min||"", tempMax:r.temp_max||"" }; };
const logToDb     = (o, uid, fields) => ({ id:o.id, user_id:uid, field_id:fields[o.fieldIdx]?.id||o.fieldId||null, crop_id:o.cropId||null, work:o.work||null, memo:o.memo||null, date:o.date||null, time:o.time||null, duration:o.duration||null, img_src:o.imgSrc||null, img2_src:o.imgSrc2||null, img3_src:o.imgSrc3||null, fert_name:o.fertName||null, fert_amt:o.fertAmt||null, fert_unit:o.fertUnit||null, fert_method:o.fertMethod||null, fert_cost:o.fertCost||null, pest_name:o.pestName||null, pest_spray_amt:o.pestSprayAmt||null, pest_dil:o.pestDil||null, pest_amt:o.pestAmt||null, pest_unit:o.pestUnit||null, pest_tgt:o.pestTarget||null, pest_cost:o.pestCost||null, hv_kg:o.hvKg||null, hv_cnt:o.hvCnt||null, hv_q:o.hvQ||null, hv_price:o.hvPrice||null, equip_ids:o.equipIds||null, equip_act:o.equipAct||null, sow_qty:o.sowQty||null, germination_cnt:o.germinationCnt||null, germ_date:o.germinationDate||null, transplant_qty:o.transplantQty||null, discard_cnt:o.discardCnt||null, add_cnt:o.addCnt||null, event_type:o.eventType||null, event_note:o.eventNote||null, hv_grade_str:o.hvGradeStr||null, other_note:o.otherNote||null, repot_size:o.repotSize||null, repot_vol:o.repotVol||null, group_id:o._groupId||null });
const logFromDb   = (r, fields) => { const fi=fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, cropId:r.crop_id||"", work:r.work||"", memo:r.memo||"", date:r.date||"", time:r.time||"", duration:r.duration||"", imgSrc:r.img_src||null, imgSrc2:r.img2_src||null, imgSrc3:r.img3_src||null, aiReply:"", fertName:r.fert_name||"", fertAmt:r.fert_amt||"", fertUnit:r.fert_unit||"", fertMethod:r.fert_method||"", fertCost:r.fert_cost||"", pestName:r.pest_name||"", pestSprayAmt:r.pest_spray_amt||"", pestDil:r.pest_dil||"", pestAmt:r.pest_amt||"", pestUnit:r.pest_unit||"", pestTarget:r.pest_target||"", pestCost:r.pest_cost||"", hvKg:r.hv_kg!=null?String(r.hv_kg):"", hvCnt:r.hv_cnt!=null?String(r.hv_cnt):"", hvQ:r.hv_q||"", hvPrice:r.hv_price||"", hvImgSrc:r.hv_img_src||null, equipIds:Array.isArray(r.equip_ids)?r.equip_ids:(r.equip_ids?JSON.parse(r.equip_ids):[]), equipAct:r.equip_act||"", hvGradeStr:r.hv_grade_str||"", otherNote:r.other_note||"", repotSize:r.repot_size||"", repotVol:r.repot_vol||"", _groupId:r.group_id||null, sowQty:r.sow_qty||"", germinationCnt:r.germination_cnt||"", germinationDate:r.germination_date||"", transplantQty:r.transplant_qty||"", discardCnt:r.discard_cnt||"", addCnt:r.add_cnt||"", eventType:r.event_type||"", eventNote:r.event_note||"" }; };
const fertMToDb   = (o, uid) => ({ id:o.id||uid0(), user_id:uid, name:o.name||null, type:o.type||null, price:o.price||null, punit:o.punit||null, capacity:o.capacity||null, cunit:o.cunit||null, npk:o.npk||null, stock:o.stock||null, sunit:o.sunit||null, note:o.note||null });
const fertMFromDb = r => ({ id:r.id, name:r.name||"", type:r.type||"", price:r.price||"", punit:r.punit||"", capacity:r.capacity||"", cunit:r.cunit||"", npk:r.npk||"", stock:r.stock||"", sunit:r.sunit||"", note:r.note||"" });
const pestMToDb   = (o, uid) => ({ id:o.id||uid0(), user_id:uid, name:o.name||null, type:o.type||null, target:o.target||null, capacity:o.capacity||null, sunit:o.sunit||null, price:o.price||null, note:o.note||null });const pestMFromDb = r => ({ id:r.id, name:r.name||"", type:r.type||"", target:r.target||"", capacity:r.capacity||"", sunit:r.sunit||"", price:r.price||"", note:r.note||"" });
const equipToDb   = (o, uid) => ({ id:o.id||uid0(), user_id:uid, name:o.name||null, cat:o.cat||null, status:o.status||null, price:o.price||null, date:o.date||null, note:o.note||null, dep_years:o.depYears||null });
const equipFromDb = r => ({ id:r.id, name:r.name||"", cat:r.cat||"", status:r.status||"", price:r.price||"", date:r.date||"", note:r.note||"", depYears:r.dep_years||"" });
const costToDb    = (o, uid, fields) => ({ id:o.id, user_id:uid, field_id:(fields&&o.fieldIdx!==undefined&&o.fieldIdx!=="")?fields[o.fieldIdx]?.id||o.fieldId||null:o.fieldId||null, crop_id:o.cropId||null, cat:o.cat||null, name:o.name||null, amt:o.amt||null, date:o.date||null, qty:o.qty||null, qunit:o.qunit||null, note:o.note||null, master_id:o.masterId||null, work:o.work||null });
const costFromDb  = (r, fields) => { const fi=fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, cropId:r.crop_id||"", masterId:r.master_id||"", cat:r.cat||"", name:r.name||"", amt:r.amt||"", date:r.date||"", qty:r.qty||"", qunit:r.qunit||"", note:r.note||"", work:r.work||"", depYears:r.dep_years||"" }; };
const plotToDb    = (o, uid) => ({ id:o.id, user_id:uid, field_id:o.fieldId||null, name:o.name||null, cols:o.cols||20, rows:o.rows||20, cells:o.cells||[], season:o.season||null, cell_size:o.cellSize||30, bg_plot_id:o.bgPlotId||null, plant_date:o.plantDate||null, end_date:o.endDate||null, kind:o.kind||null, beds:o.beds||null, plantings:o.plantings||null });
const plotFromDb  = r => ({ id:r.id, fieldId:r.field_id||"", name:r.name||"", cols:r.cols||20, rows:r.rows||20, cells:Array.isArray(r.cells)?r.cells:(r.cells?JSON.parse(r.cells):[]), season:r.season||"", cellSize:r.cell_size||30, bgPlotId:r.bg_plot_id||"", plantDate:r.plant_date||"", endDate:r.end_date||"", kind:r.kind||"", beds:Array.isArray(r.beds)?r.beds:(r.beds?JSON.parse(r.beds):[]), plantings:Array.isArray(r.plantings)?r.plantings:(r.plantings?JSON.parse(r.plantings):[]) });

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
  radish:       { n:"ダイコン",   e:"🌰", d:60, hd:30,  w:2, cat:"アブラナ科",hs:"根が地表に出て肩の直径6〜8cm",               events:["間引き完了","収穫"], maturity:{early:50,mid:60,late:75} },
  komatsuna:    { n:"小松菜",     e:"🥬", d:35, hd:14,  w:1, cat:"アブラナ科",hs:"草丈20〜25cmで収穫",                         events:["収穫"], maturity:{early:30,mid:35,late:45} },
  // ─── マメ科 ───
  edamame:      { n:"枝豆",       e:"🫘", d:70,  w:2, cat:"マメ科",   hs:"さやが膨らんで豆の形がはっきりわかる状態",    events:["開花","さや形成","収穫"], maturity:{early:60,mid:70,late:85} },
  green_bean:   { n:"インゲン",   e:"🫘", d:55, hd:30,  w:2, cat:"マメ科",   hs:"さやが膨らむ前・すじが出る前に収穫",          events:["開花","さや形成","収穫"], maturity:{early:45,mid:55,late:65} },
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
  edamame:"マメ科",green_bean:"マメ科",azuki:"マメ科",lettuce:"キク科",carrot:"セリ科",
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
  komatsuna:   {years:1,ng:["アブラナ科"]},
  // ─── マメ科 ───
  edamame:     {years:3,ng:["マメ科"]},
  green_bean:  {years:2,ng:["マメ科"]},
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
  const harvestD = db.d || 90;
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
const WORK_TYPES = [
  { value:"sow",        label:"播種",         tag:"green",  icon:"🌰" },
  { value:"germinated", label:"発芽確認",     tag:"green",  icon:"🌱" },
  { value:"transplant", label:"定植",         tag:"purple", icon:"🪴" },
  { value:"water",      label:"水やり",       tag:"blue",   icon:"💧" },
  { value:"fert",       label:"施肥",         tag:"green",  icon:"🌿" },
  { value:"pest",       label:"防除",         tag:"yellow", icon:"🐛" },
  { value:"pruning",    label:"剪定",         tag:"green",  icon:"✂️" },
  { value:"thinning",   label:"摘果・摘花",   tag:"pink",   icon:"🌸" },
  { value:"sideshot",   label:"脇芽かき",     tag:"green",  icon:"🌱" },
  { value:"repot",      label:"植え替え",     tag:"purple", icon:"🪣" },
  { value:"event",      label:"生育記録",     tag:"pink",   icon:"📋" },
  { value:"harvest",    label:"収穫",         tag:"pink",   icon:"🧺" },
  { value:"discard",    label:"廃棄・株調整", tag:"gray",   icon:"♻️" },
  { value:"equip",      label:"資材作業",     tag:"gray",   icon:"🏗️" },  { value:"check",      label:"見回り",       tag:"gray",   icon:"👀" },
  { value:"other",      label:"その他",       tag:"gray",   icon:"✏️" },
];

const WORK = {
    sow:{label:'播種',tag:'green',icon:'🌱'},
    germinated:{label:'発芽確認',tag:'green',icon:'🌿'},
    transplant:{label:'定植',tag:'purple',icon:'🪴'},
    water:{label:'水やり',tag:'blue',icon:'💧'},
    fert:{label:'施肥',tag:'teal',icon:'🌿'},
    pest:{label:'防除',tag:'yellow',icon:'🐛'},
    pruning:{label:'剪定',tag:'gray',icon:'✂️'},
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
const COST_CATS = [
  { value:"seed",  label:"🌱 種・苗" },
  { value:"fert",  label:"🌿 肥料・土壌改良材" },
  { value:"pest",  label:"🐛 農薬" },
  { value:"equip", label:"🏗️ 資材・設備" },
  { value:"labor", label:"👷 労務費" },
  { value:"other", label:"📦 その他" },
];
const WX_MAP = [[0,"☀️","快晴"],[3,"⛅","晴れ時々くもり"],[48,"🌫️","霧"],[67,"🌧️","雨"],[77,"❄️","雪"],[82,"🌦️","にわか雨"],[99,"⛈️","雷雨"]];
const wxIcon  = c => { for(const [t,i] of WX_MAP) if(c<=t) return i; return "⛈️"; };
const wxLabel = c => { for(const [t,,l] of WX_MAP) if(c<=t) return l; return "雷雨"; };
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
const daysSince= d => d ? Math.floor((Date.now()-new Date(d))/86400000) : 0;
const fmtDate  = d => (d.getMonth()+1)+"/"+d.getDate();
const todayStr = () => new Date().toISOString().slice(0,10);
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
      +"&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,precipitation_probability_max"
      +"&timezone=Asia%2FTokyo&forecast_days=5";
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
  app:   { display:"flex", flexDirection:"column", height:"100svh", maxWidth:960, margin:"0 auto", background:"#f8f5ef", boxShadow:"0 0 40px rgba(0,0,0,.15)" },
  topbar:{ background:G, color:"#fff", height:52, display:"flex", alignItems:"center", padding:"0 13px", gap:8, flexShrink:0 },
  logo:  { fontFamily:"'Shippori Mincho B1',serif", fontSize:"1.1rem", letterSpacing:".06em" },
  tbBtn: { background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.25)", color:"#fff", borderRadius:8, padding:"5px 10px", fontSize:".72rem", cursor:"pointer", flexShrink:0 },
  main:  { flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" },
  scr:   { padding:"12px 12px 80px" },
  bnav:  { background:GD, display:"flex", borderTop:"1px solid rgba(255,255,255,.08)", flexShrink:0, height:58, paddingBottom:"env(safe-area-inset-bottom)" },
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
function Sel({ value, onChange, options, style={} }) { return <select value={value||""} onChange={e=>{ if(!options.find(o=>o.value===e.target.value)?.disabled) onChange(e.target.value); }} style={{...S.inp,...style}}>{options.map(o=><option key={o.value} value={o.value} disabled={o.disabled} style={o.disabled?{color:"#aaa",fontWeight:700,background:"#f5f5f0"}:{}}>{o.label}</option>)}</select>; }
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
  if(!open) return null;
  return (
    <div className="app-modal" style={{position:"fixed",left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:960,bottom:0,zIndex:9999,display:"flex",flexDirection:"column",background:"#f8f5ef"}}>
      <div style={{background:GD,color:"#fff",padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:8}}>
        <span style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".92rem",fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:".8rem",cursor:"pointer",flexShrink:0,minWidth:40,minHeight:40}}>✕</button>
        <button onClick={onSave} style={{background:"#fff",border:"none",color:G,borderRadius:8,padding:"6px 14px",fontSize:".8rem",fontWeight:700,cursor:"pointer",flexShrink:0,minWidth:60,minHeight:40}}>{saveLabel} ✓</button>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"14px 14px 40px"}}>
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
        <div style={{fontSize:".76rem",color:TX3,marginBottom:20}}>作物の記録アプリ</div>
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
        <div style={{fontSize:".62rem",color:"#ccc",marginTop:8}}>v1.6.92</div>
      </div>
    </div>
  );
}

function HomeScreen({ fields, crops, logs, costs, onEditCrop }) {
  const [wx, setWx] = useState(null);

  const [wxFieldIdx, setWxFieldIdx] = useState(0);
  const wxField = fields[wxFieldIdx] || fields[0];
  const addr0   = wxField?.addr || "";
  useEffect(() => { fetchWeather(addr0).then(setWx); }, [addr0]);


  return (
    <div style={{padding:"10px 12px 16px"}}>

      {wx && (
        <div style={{background:"linear-gradient(135deg,#1565a8,#3498db)",borderRadius:14,padding:"13px 15px",color:"#fff",marginBottom:9}}>
          {fields.length > 1 && (
            <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
              {fields.map((f,i)=>(
                <button key={f.id} onClick={()=>setWxFieldIdx(i)}
                  style={{background:wxFieldIdx===i?"rgba(255,255,255,.9)":"rgba(255,255,255,.18)",color:wxFieldIdx===i?"#1565a8":"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:999,padding:"3px 10px",fontSize:".71rem",cursor:"pointer",fontFamily:"inherit",fontWeight:wxFieldIdx===i?700:400}}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
            <span style={{fontSize:"2.3rem"}}>{wxIcon(wx.code)}</span>
            <div>
              <div style={{fontSize:"1.8rem",fontWeight:700,lineHeight:1}}>{wx.temp}°C</div>
              <div style={{fontSize:".72rem",opacity:.8,marginTop:2}}>{wx.label} / {wxLabel(wx.code)}</div>
              <div style={{display:"flex",gap:8,marginTop:3,fontSize:".68rem",opacity:.78}}><span>💧{wx.rain}mm</span><span>💨{wx.wind}m/s</span><span>💦{wx.humid}%</span></div>
            </div>
            <div style={{background:"rgba(255,255,255,.19)",borderRadius:9,padding:"7px 11px",fontSize:".73rem",lineHeight:1.4,textAlign:"center",marginLeft:"auto"}}>{wxAdvice(wx)}</div>
          </div>
          {/* 時間別予報 */}
          {wx.hourly && wx.hourly.length > 0 && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:".63rem",opacity:.6,marginBottom:5}}>時間別予報</div>
              <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
                {wx.hourly.filter((_,i)=>i%2===0).slice(0,12).map((h,i)=>(
                  <div key={i} style={{flexShrink:0,background:"rgba(255,255,255,.13)",borderRadius:9,padding:"5px 7px",textAlign:"center",minWidth:44}}>
                    <div style={{fontSize:".6rem",opacity:.7}}>{h.hour}時</div>
                    <div style={{fontSize:"1rem",margin:"2px 0"}}>{wxIcon(h.code)}</div>
                    <div style={{fontSize:".7rem",fontWeight:700}}>{h.temp}°</div>
                    {h.pop>0&&<div style={{fontSize:".58rem",opacity:.8,color:"#90caf9"}}>💧{h.pop}%</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 3日間予報 */}
          {wx.daily && (
            <div style={{display:"flex",gap:6,marginTop:8}}>
              {[0,1,2,3].map(i=>{
                const now=new Date();
                const d=new Date(now); d.setDate(d.getDate()+i);
                const label=i===0?"今日":i===1?"明日":i===2?"明後日":"3日後";
                return(
                  <div key={i} style={{flex:1,background:"rgba(255,255,255,.13)",borderRadius:9,padding:5,textAlign:"center",fontSize:".67rem"}}>
                    <div style={{opacity:.7,marginBottom:1}}>{label}</div>
                    <div style={{fontSize:"1.1rem"}}>{wxIcon(wx.daily.weathercode[i])}</div>
                    <div style={{fontWeight:700,marginTop:1}}>{Math.round(wx.daily.temperature_2m_max[i])}°/<span style={{opacity:.7}}>{Math.round(wx.daily.temperature_2m_min[i])}°</span></div>
                    {wx.daily.precipitation_probability_max&&<div style={{fontSize:".58rem",opacity:.8,color:"#90caf9"}}>💧{wx.daily.precipitation_probability_max[i]}%</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

function MasterScreen({ fertMs, setFertMs, pestMs, setPestMs, equips, setEquips, costs, setCosts, showToast }) {
  // 全資材を統合して管理
  const [srchM, setSrchM] = useState("");
  const [mItem,  setMItem]  = useState(null);  // 編集モーダル
  const [mBuy,   setMBuy]   = useState(null);  // 購入モーダル

  // 全資材リスト（種類タグ付き）
  const allItems = [
    ...fertMs.map((f,i)=>({...f, _type:"fert",  _idx:i, _label:"肥料",   _color:"#d1fae5", _tc:"#065f46", _icon:"🌿"})),
    ...pestMs.map((p,i)=>({...p, _type:"pest",  _idx:i, _label:"農薬",   _color:"#fef3c7", _tc:"#92400e", _icon:"🐛"})),
    ...equips.map((e,i)=>({...e, _type:"equip", _idx:i, _label:"設備・資材", _color:"#ede9fe", _tc:"#5b21b6", _icon:"🏗️"})),
  ];
  const toHiraM=s=>(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  const toKataM=s=>(s||'').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
  const matchM=(t,w)=>{const a=(t||'').toLowerCase(),b=w.toLowerCase();return toHiraM(a).includes(toHiraM(b))||toKataM(a).includes(toKataM(b))||a.includes(b);};
  const shown = srchM ? allItems.filter(x=>matchM(x.name,srchM)||matchM(x._label,srchM)||matchM(x.note,srchM)) : allItems;

  // 保存
  const saveItem = () => {
    if(!mItem) return;
    const isEdit = mItem._idx !== undefined;
    const item = {...mItem, id:mItem.id||uid0()};
    if(item._type==="fert"){
      // idベースで更新（_idxよりも確実）
      const n=isEdit?fertMs.map(x=>x.id===item.id?{...item}:x):[...fertMs,item];
      setFertMs(n,item);
    } else if(item._type==="pest"){
      const n=isEdit?pestMs.map(x=>x.id===item.id?{...item}:x):[...pestMs,item];
      setPestMs(n,item);
    } else {
      const n=isEdit?equips.map(x=>x.id===item.id?{...item}:x):[...equips,item];
      setEquips(n,item);
    }
    // マスター編集時に連動費用の名前も更新
    if(isEdit && item.id){
      const updatedCosts = costs.map(c=>{
        if(c.masterId===item.id){
          return {...c, name:item.name};
        }
        return c;
      });
    }
    // 費用自動追加（価格が入力されている場合）
    if(item.price && parseFloat(item.price) > 0) {
      const costCat = item._type==="equip"?"equip":item._type;
      const costName = item.name + (item.capacity?" ("+item.capacity+(item.cunit||item.sunit||"")+"入り)":"");
      if(isEdit) {
        // 編集時：同じIDの費用を更新
        const existCostIdx = costs.findIndex(c=>c.masterId===item.id);
        if(existCostIdx >= 0) {
          const updated = costs.map((c,i)=>i===existCostIdx?{...c,amt:String(item.price),name:costName}:c);
          const updCost = updated[existCostIdx];
          setCosts(updated, updCost);
        }
      } else {
        // 新規：費用を追加（償却資材はdepYearsを引き継ぐ）
        const newCost = {id:uid0(),masterId:item.id,cat:costCat,name:costName,amt:String(item.price),date:item.date||todayStr(),qty:"1",qunit:"個",fieldIdx:"",depYears:item.depYears||"",note:item.depYears?("減価償却"+item.depYears+"年"):"マスター登録時に自動追加"};
        setCosts([...costs, newCost], newCost);
      }
    }
    setMItem(null); showToast("保存しました");
  };

  // 削除
  const deleteItem = (item) => {
    if(!window.confirm("削除しますか？"))return;
    if(item._type==="fert"){ dbDelete("fert_masters",item.id); setFertMs(fertMs.filter((_,i)=>i!==item._idx)); }
    else if(item._type==="pest"){ dbDelete("pest_masters",item.id); setPestMs(pestMs.filter((_,i)=>i!==item._idx)); }
    else { dbDelete("equipments",item.id); setEquips(equips.filter((_,i)=>i!==item._idx)); }
    // マスター削除時に連動費用も削除
    if(item.id){
      const relatedCosts = costs.filter(c=>c.masterId===item.id);
      relatedCosts.forEach(c=>{ dbDelete("costs",c.id); });
      if(relatedCosts.length>0){
        setCosts(costs.filter(c=>c.masterId!==item.id));
      }
    }
    showToast("削除しました");
  };

  // 購入保存
  const saveBuy = () => {
    if(!mBuy.cnt||!mBuy.amt){showToast("個数と金額を入力してください");return;}
    const cnt = parseFloat(mBuy.cnt)||0;
    const cap = parseFloat(mBuy.capacity)||0;
    const addStock = cap>0 ? cnt*cap : cnt;
    // 在庫更新
    const updItem = {...mBuy._item, stock:String((parseFloat(mBuy._item.stock)||0)+addStock)};
    if(mBuy._type==="fert") setFertMs(fertMs.map((x,i)=>i===mBuy._idx?updItem:x),updItem);
    else if(mBuy._type==="pest") setPestMs(pestMs.map((x,i)=>i===mBuy._idx?updItem:x),updItem);
    // 費用追加
    const cap2 = parseFloat(mBuy.capacity)||0;
    const label = mBuy.name+(cap2>0?" "+cnt+"個("+addStock+(mBuy.sunit||mBuy.cunit||"")+")":" "+cnt+"個");
    setCosts([...costs,{id:uid0(),cat:mBuy._type==="equip"?"equip":mBuy._type,name:label,amt:String(mBuy.amt),date:mBuy.date||todayStr(),qty:String(cnt),qunit:"個",fieldIdx:"",note:mBuy.note||""}],
      {id:uid0(),cat:mBuy._type==="equip"?"equip":mBuy._type,name:label,amt:String(mBuy.amt),date:mBuy.date||todayStr(),qty:String(cnt),qunit:"個",fieldIdx:"",note:mBuy.note||""});
    showToast("購入記録しました（在庫+"+(cap>0?addStock+(mBuy.sunit||mBuy.cunit||""):cnt+"個")+"・費用+"+Math.round(mBuy.amt).toLocaleString()+"円）");
    setMBuy(null);
  };



  // 新規作成のデフォルト
  const newFert  = {_type:"fert",  name:"",type:"化成肥料",npk:"",price:"",punit:"円/袋",capacity:"",cunit:"kg",stock:"0",sunit:"kg",note:""};
  const newPest  = {_type:"pest",  name:"",type:"殺虫剤",dil:"",target:"",price:"",punit:"円/本",capacity:"",cunit:"ml",stock:"0",sunit:"ml",note:""};
  const newEquip = {_type:"equip", name:"",cat:"マルチ",status:"使用中",price:"",date:todayStr(),note:"",_label:"資材",_color:"#ede9fe",_tc:"#5b21b6",_icon:"🏗️"};

  return (
    <div style={S.scr} className="scr-inner">
      {/* フィルタータブ */}
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        
        <div style={{flex:1}}/>
        <button style={{...S.btn,background:G3,color:G,border:"1px solid "+G,borderRadius:999,padding:"6px 14px",fontSize:".78rem",fontWeight:700,width:"auto",flexShrink:0}}
          onClick={()=>setMItem({...newFert,_idx:undefined})}>＋ 肥料</button>
        <button style={{...S.btn,background:"#fffde7",color:"#92400e",border:"1px solid #f9e4a0",borderRadius:999,padding:"6px 14px",fontSize:".78rem",fontWeight:700,width:"auto",flexShrink:0}}
          onClick={()=>setMItem({...newPest,_idx:undefined})}>＋ 農薬</button>
        <button style={{...S.btn,background:"#ede9fe",color:"#5b21b6",border:"1px solid #c4b5fd",borderRadius:999,padding:"6px 14px",fontSize:".78rem",fontWeight:700,width:"auto",flexShrink:0}}
          onClick={()=>setMItem({...newEquip,_idx:undefined})}>＋ 資材・設備</button>
      </div>

      {!shown.length&&<div style={{color:TX3,fontSize:".82rem",padding:16,textAlign:"center"}}>資材がまだ登録されていません</div>}

      {shown.map((item,i)=>(
        <div key={item.id||i} style={{...S.card,borderLeft:"4px solid "+(item._type==="fert"?"#6ee7b7":item._type==="pest"?"#fcd34d":"#a78bfa")}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:"1.6rem",lineHeight:1.2}}>{item._icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:".92rem"}}>{item.name}</span>
                <span style={{fontSize:".65rem",fontWeight:700,padding:"2px 7px",borderRadius:999,background:item._color,color:item._tc}}>{item._label}</span>
                {item.type&&<span style={{fontSize:".65rem",color:TX3}}>{item.type}</span>}
              </div>
              {/* 在庫・単価情報 */}
              <div style={{marginTop:5,display:"flex",gap:10,flexWrap:"wrap",fontSize:".75rem"}}>

                {item.capacity&&<div style={{background:"#f5f5f0",borderRadius:8,padding:"4px 10px"}}>
                  <span style={{color:TX3}}>内容量 </span>
                  <span style={{fontWeight:700}}>{item.capacity}{item.cunit||""}</span>
                </div>}
                {item.price&&<div style={{background:"#f5f5f0",borderRadius:8,padding:"4px 10px"}}>
                  <span style={{color:TX3}}>単価 </span>
                  <span style={{fontWeight:700}}>{item.price}円</span>
                </div>}
                {item._type==="fert"&&item.npk&&<div style={{background:"#f5f5f0",borderRadius:8,padding:"4px 10px"}}>
                  <span style={{color:TX3}}>N-P-K </span>
                  <span style={{fontWeight:700}}>{item.npk}</span>
                </div>}
                {item._type==="pest"&&item.dil&&<div style={{background:"#f5f5f0",borderRadius:8,padding:"4px 10px"}}>
                  <span style={{color:TX3}}>希釈 </span>
                  <span style={{fontWeight:700}}>{item.dil}倍</span>
                </div>}
                {item._type==="equip"&&item.status&&<div style={{background:"#f5f5f0",borderRadius:8,padding:"4px 10px"}}>
                  <span style={{fontWeight:700}}>{item.status}</span>
                </div>}
              </div>
              {item.note&&<div style={{fontSize:".7rem",color:TX3,marginTop:4}}>{item.note}</div>}
            </div>
          </div>
          {/* アクションボタン */}
          <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
            {item._type!=="equip"&&<button
              style={{...S.btn,background:G,color:"#fff",padding:"6px 12px",fontSize:".75rem",borderRadius:8,width:"auto",fontWeight:700}}
              onClick={()=>setMBuy({...item,_item:item,cnt:"",amt:"",date:todayStr(),note:""})}>
              🛒 購入を記録
            </button>}
            {item._type==="equip"&&<button
              style={{...S.btn,background:G,color:"#fff",padding:"6px 12px",fontSize:".75rem",borderRadius:8,width:"auto",fontWeight:700}}
              onClick={()=>setMBuy({...item,_item:item,cnt:"1",amt:item.price||"",date:todayStr(),note:""})}>
              🛒 費用を記録
            </button>}

            <button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>setMItem({...item})}>編集</button>
            <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>deleteItem(item)}>削除</button>
          </div>
        </div>
      ))}

      {/* 登録・編集モーダル */}
      <ModalWithSave open={!!mItem} onClose={()=>setMItem(null)} title={mItem?._idx!==undefined?"資材を編集":"資材を登録"} onSave={saveItem}>
        {mItem&&<>
          <FG label="資材名"><Inp value={mItem.name||""} onChange={v=>setMItem({...mItem,name:v})} placeholder="例：スミチオン乳剤"/></FG>

          {mItem._type==="fert"&&<>
            <R2>
              <FG label="肥料の種類"><Sel value={mItem.type||"化成肥料"} onChange={v=>setMItem({...mItem,type:v})}
                options={["化成肥料","有機肥料","液肥","緩効性肥料","石灰・土壌改良材","培養土・堆肥","その他"].map(v=>({value:v,label:v}))}/></FG>
              <FG label="N-P-K"><Inp value={mItem.npk||""} onChange={v=>setMItem({...mItem,npk:v})} placeholder="8-8-8"/></FG>
            </R2>
          </>}

          {mItem._type==="pest"&&<>
            <R2>
              <FG label="農薬の種類"><Sel value={mItem.type||"殺虫剤"} onChange={v=>setMItem({...mItem,type:v})}
                options={["殺虫剤","殺菌剤","除草剤","殺虫殺菌剤","その他"].map(v=>({value:v,label:v}))}/></FG>
              <FG label="希釈倍数"><Inp type="number" value={mItem.dil||""} onChange={v=>setMItem({...mItem,dil:v})} placeholder="1000"/></FG>
            </R2>
            <FG label="対象作物・病害虫"><Inp value={mItem.target||""} onChange={v=>setMItem({...mItem,target:v})} placeholder="例：アブラムシ"/></FG>
          </>}

          {mItem._type==="equip"&&<>
            <R2>
              <FG label="カテゴリ"><Sel value={mItem.cat||"マルチ"} onChange={v=>setMItem({...mItem,cat:v})}
                options={["マルチ","トンネル資材","防虫ネット","支柱・杭","ハウス設備","かん水設備","動力機械","プランター・育苗ポット","農機具","その他"].map(v=>({value:v,label:v}))}/></FG>
              <FG label="状態"><Sel value={mItem.status||"使用中"} onChange={v=>setMItem({...mItem,status:v})}
                options={["使用中","保管中","メンテナンス中","廃棄"].map(v=>({value:v,label:v}))}/></FG>
            </R2>
          </>}

          {mItem._type!=="equip"&&<>
            <div style={{background:"#f0f9f0",borderRadius:10,padding:"10px 12px",marginBottom:9}}>
              <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".82rem",color:"#5c3d1e",marginBottom:8}}>📦 在庫・購入情報</div>
              <R2>
                <FG label="内容量（1個あたり）">
                  <div style={{display:"flex",gap:4}}>
                    <Inp type="number" value={mItem.capacity||""} onChange={v=>setMItem({...mItem,capacity:v})} placeholder="例：500" style={{flex:1}}/>
                    <Sel value={mItem.cunit||"ml"} onChange={v=>setMItem({...mItem,cunit:v,sunit:v})}
                      options={["ml","L","g","kg"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/>
                  </div>
                </FG>
                <FG label="単価（円/個）"><Inp type="number" value={mItem.price||""} onChange={v=>setMItem({...mItem,price:v})} placeholder="例：2000"/></FG>
              </R2>
            </div>
          </>}

          {mItem._type==="equip"&&<>
            <R2>
              <FG label="購入価格（円）"><Inp type="number" value={mItem.price||""} onChange={v=>setMItem({...mItem,price:v})}/></FG>
              <FG label="購入日"><Inp type="date" value={mItem.date||todayStr()} onChange={v=>setMItem({...mItem,date:v})}/></FG>
            </R2>
            <FG label="減価償却年数（高額・長期使用の農機具等）">
              <Sel value={mItem.depYears||""} onChange={v=>setMItem({...mItem,depYears:v})}
                options={[{value:"",label:"償却しない（購入時に全額計上）"},...[2,3,4,5,6,7,8,10,15,17,22].map(n=>({value:String(n),label:n+"年で償却"}))]}/>
              <div style={{fontSize:".68rem",color:TX3,marginTop:3}}>例：耕運機7年・トラクター7年・ハウス10〜15年。設定すると購入額を年数で按分してレポートに計上します</div>
            </FG>
          </>}

          <FG label="メモ"><Inp value={mItem.note||""} onChange={v=>setMItem({...mItem,note:v})} placeholder="購入先・注意事項など"/></FG>
        </>}
      </ModalWithSave>

      {/* 購入記録モーダル */}
      <ModalWithSave open={!!mBuy} onClose={()=>setMBuy(null)} title={"🛒 "+( mBuy?.name||"")+" の購入"} onSave={saveBuy}>
        {mBuy&&<>
          <div style={{background:G3,borderRadius:9,padding:"8px 12px",marginBottom:10,fontSize:".8rem",color:G}}>
            {mBuy.capacity&&<span>内容量: <b>{mBuy.capacity}{mBuy.cunit}/個</b> · </span>}
            {mBuy.price&&<span>単価: <b>{mBuy.price}円/個</b></span>}
          </div>
          <R2>
            <FG label="購入個数">
              <Inp type="number" value={mBuy.cnt||""} onChange={v=>{
                const cnt=parseFloat(v)||0;
                const cap=parseFloat(mBuy.capacity)||0;
                const autoAmt=mBuy.price&&cnt?String(Math.round(parseFloat(mBuy.price)*cnt)):"";
                setMBuy({...mBuy,cnt:v,amt:autoAmt,_addStock:cap>0?cnt*cap:cnt});
              }} placeholder="例：3"/>
            </FG>
            <FG label="購入金額（円）">
              <Inp type="number" value={mBuy.amt||""} onChange={v=>setMBuy({...mBuy,amt:v})} placeholder="自動計算"/>
            </FG>
          </R2>
          {mBuy.cnt&&parseFloat(mBuy.capacity)>0&&(
            <div style={{fontSize:".75rem",color:G,background:G3,borderRadius:8,padding:"6px 10px",marginBottom:8}}>
              ✅ 在庫 +{(parseFloat(mBuy.cnt)||0)*parseFloat(mBuy.capacity)}{mBuy.sunit||mBuy.cunit||""}
            </div>
          )}
          <FG label="購入日"><Inp type="date" value={mBuy.date||todayStr()} onChange={v=>setMBuy({...mBuy,date:v})}/></FG>
          <FG label="メモ（購入先など）"><Inp value={mBuy.note||""} onChange={v=>setMBuy({...mBuy,note:v})} placeholder="例：農協"/></FG>
        </>}
      </ModalWithSave>


    </div>
  );
}

// FIELDS
function FieldsScreen({ fields, setFields, setFieldsR, crops, setCrops, setCropsR, costs, setCosts, logs, showToast, editCrop }) {
  const [mField, setMField] = useState(null);
  const [mCrop,  setMCrop]  = useState(null);

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
        console.log("Adding new cost entry:", newEntry);
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
            <div style={{display:"flex",gap:4}}><button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>setMField({...f,_idx:i})}>編集</button><button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{if(!window.confirm("削除しますか?"))return;dbDelete("fields",f.id);if(typeof setFieldsR==="function")setFieldsR(fields.filter((_,j)=>j!==i));else setFields(fields.filter((_,j)=>j!==i));showToast("削除しました");}}>削除</button></div>
          </div>
          {f.memo&&<div style={{fontSize:".76rem",color:"#5a5040",marginTop:5}}>{f.memo}</div>}
          <div style={{fontSize:".7rem",color:TX3,marginTop:5}}>品目:{crops.filter(c=>c.fieldIdx===i).length}品目 / 記録:{logs.filter(l=>l.fieldIdx===i).length}件</div>
        </div>
      ))}
      <div style={S.sec}><span>🌱 栽培中（{crops.filter(c=>!c.ended).length}件）</span><button style={S.secBtn} onClick={()=>setMCrop({...eC,fieldIdx:0})}>＋ 品目追加</button></div>
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
                  {c.type==="custom"?c.customName||"カスタム":db.n||c.type}
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
              <button style={{...S.btn,...S.btnS,...S.btnSm}}
                onClick={()=>{const existingSeed=costs.find(co=>co.cropId===c.id&&co.cat==="seed");setMCrop({...c,_idx:i,seedCost:c.seedCost||existingSeed?.amt||""});}}>編集</button>
              <button style={{...S.btn,...S.btnSm,background:"#f59e0b",color:"#fff"}}
                onClick={()=>{const copy={...c,id:uid0(),_idx:undefined};setMCrop(copy);showToast("複製します。内容を確認して保存してください");}}>コピー</button>
              <button style={{...S.btn,...S.btnSm,background:"#fff",color:"#c2410c",border:"1px solid #f0b896"}}
                onClick={()=>{const ed=window.prompt("栽培終了日を入力してください",todayStr());if(ed===null)return;const u={...c,ended:true,endDate:ed||todayStr()};setCrops(crops.map((x,j)=>j===i?u:x),u);showToast("栽培を終了しました");}}>終了</button>
              <button style={{...S.btn,...S.btnR,...S.btnSm}}
                onClick={()=>{if(!window.confirm("削除しますか?"))return;dbDelete("crops",c.id);const filtered=crops.filter((_,j)=>j!==i);if(typeof setCropsR==="function")setCropsR(filtered);else setCrops(filtered);showToast("削除しました");}}>削除</button>
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
                  <div style={{fontWeight:700,fontSize:".88rem"}}>{c.type==="custom"?c.customName||"カスタム":db.n||c.type}{c.variety?" ("+c.variety+")":""}</div>
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
function LogScreen({ fields, crops, setCrops, fertMs, pestMs, equips, costs, setCosts, logs, setLogs, dbSaveLog, setLogsR, showToast, initialWork, editLog, editLogs=[], uid, saveRef, onDone }) {
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
  const [fertAmt,  setFertAmt]  = useState("");
  const [fertUnit, setFertUnit] = useState("kg");
  const [fertMeth, setFertMeth] = useState("追肥");
  const [fertCost, setFertCost] = useState("");
  // 施肥複数登録用
  const emptyFert = () => ({name:"",amt:"",unit:"kg",meth:"追肥",cost:""});
  const emptyPest = () => ({name:"",dil:"",sprayAmt:"",sprayUnit:"L",tgt:"",cost:""});
  const emptyEquip = () => ({idx:"",act:"設置"});
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
  const [repotSize, setRepotSize] = useState("");
  const [repotVol,  setRepotVol]  = useState("");
  const [isRec,    setIsRec]    = useState(false);
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
      setEventType("");setEventNote("");setOtherNote("");
      setHvKg("");setHvCnt("");setHvQ("秀品");setHvPrice("");
      setDiscardCnt("");setAddCnt("");setEquipSel([]);setEquipAct("設置");setEquipEntries([]);setRepotSize("");setRepotVol("");  return;
    }
    setEditId(editLog._isCopy ? null : editLog.id);
    setFieldIdx(editLog.fieldIdx||0);
    setCropId(editLog.cropId||"");
    // 複数作業を復元
    const _allWorks = (editLogs&&editLogs.length>1)
      ? new Set(editLogs.map(l=>l.work).filter(Boolean))
      : new Set(editLog.work?[editLog.work]:[]);
    setWorks(_allWorks);
    setMemo(editLog.memo||"");
    setDate(editLog.date||todayStr());
    setTime(editLog.time||nowTime());
    setDur(editLog.duration||"");

    // editLogsから各作業タイプのlogを取得
    const allL    = editLogs&&editLogs.length>0 ? editLogs : [editLog];
    const hvLog   = allL.find(l=>l.work==='harvest')    || editLog;
    const fertLog = allL.find(l=>l.work==='fert')       || editLog;
    const pestLog = allL.find(l=>l.work==='pest')       || editLog;
    const discLog = allL.find(l=>l.work==='discard')    || editLog;
    const equipLog= allL.find(l=>l.work==='equip')      || editLog;
    const sowLog  = allL.find(l=>l.work==='sow'||l.work==='germinated') || editLog;
    const tplLog  = allL.find(l=>l.work==='transplant') || editLog;
    const eventLog= allL.find(l=>l.work==='event')      || editLog;
    const otherLog= allL.find(l=>l.work==='other')      || editLog;

    // 播種・発芽・定植
    setSowQty(sowLog.sowQty||"");
    setGermCnt(sowLog.germinationCnt||"");
    setTranspQty(tplLog.transplantQty||"");

    // 生育イベント
    setEventType(eventLog.eventType||"");
    setEventNote(eventLog.eventNote||"");

    // その他
    setOtherNote(otherLog.otherNote||"");

    // 施肥1件目 ─ fertNameで名前を復元、マスターIndexも復元
    setFertName(fertLog.fertName||"");
    setFertAmt(fertLog.fertAmt||"");
    setFertUnit(fertLog.fertUnit||"kg");
    setFertMeth(fertLog.fertMethod||"追肥");
    setFertCost(fertLog.fertCost||"");
    // 施肥の追加エントリ復元
    const extraFerts = allL.filter(l=>l.work==='fert').slice(1);
    setFertEntries(extraFerts.map(l=>({name:l.fertName||"",amt:l.fertAmt||"",unit:l.fertUnit||"kg",meth:l.fertMethod||"追肥",cost:l.fertCost||""})));

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
    setPestEntries(extraPests.map(l=>({name:l.pestName||"",dil:l.pestDil||"",sprayAmt:l.pestSprayAmt||"",sprayUnit:l.pestUnit||"L",tgt:l.pestTarget||"",cost:l.pestCost||""})));

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
    const _equipActs=["設置","撤去","交換","修理","保管","その他"];
    const _rawAct=equipLog.equipAct||"設置";
    const _pureAct=_equipActs.find(a=>_rawAct===a||_rawAct.endsWith(" "+a))||_rawAct;
    setEquipAct(_pureAct);
    const _eIds = Array.isArray(equipLog.equipIds) ? equipLog.equipIds
                : (equipLog.equipIds ? JSON.parse(equipLog.equipIds) : []);
    setEquipSel(_eIds.length>0 ? [_eIds[0]] : []);
    // 資材の追加エントリ復元
    const extraEquips = allL.filter(l=>l.work==='equip').slice(1);
    setEquipEntries(extraEquips.map(l=>{
      const ids=Array.isArray(l.equipIds)?l.equipIds:(l.equipIds?JSON.parse(l.equipIds):[]);
      return {idx:ids.length>0?ids[0]:"", act:l.equipAct||"設置"};
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
        fertName:'', fertAmt:'', fertUnit:'', fertMethod:'', fertCost:'',
        pestName:'', pestDil:'', pestAmt:'', pestUnit:'', pestTarget:'', pestCost:'',
        hvKg:'', hvCnt:'', hvQ:'秀品', hvPrice:'', hvGradeStr:'',
        equipIds:[], equipAct:'',
      };
      // 作業固有の詳細データ
      if(w==='fert') Object.assign(e,{fertName,fertAmt,fertUnit,fertMethod:fertMeth,fertCost});
      if(w==='pest') Object.assign(e,{pestName,pestDil,pestAmt,pestUnit,pestSprayAmt,pestTarget:pestTgt,pestCost});
      if(w==='harvest') Object.assign(e,{
        hvKg:totalHvKg>0?String(totalHvKg):hvKg,
        hvCnt:totalHvCnt>0?String(totalHvCnt):hvCnt,
        hvQ:hvGradeEntries.length>1?'品質別':hvGradeEntries.length===1?hvGradeEntries[0][0]:hvQ,
        hvPrice, hvGradeStr:hvGradeEntries.length>0?gradeStr:'',
      });
      if(w==='equip') {
        // equip_actに「資材名 作業種別」を結合して保存
        const _en=equipSel.map(i=>equips[i]?.name).filter(Boolean);
        const _fa=(_en.join('・')+(_en.length?' ':'')+equipAct).trim();
        Object.assign(e,{equipIds:equipSel, equipAct:_fa||equipAct});
      }
      if(w==='discard') Object.assign(e,{discardCnt,addCnt});
      if(w==='sow') Object.assign(e,{sowQty,germinationCnt:germCnt,germinationDate:germDate});
      if(w==='transplant') Object.assign(e,{transplantQty:transpQty});
      if(w==='repot') Object.assign(e,{repotSize,repotVol});
      if(w==='event') Object.assign(e,{eventType,eventNote});
      if(w==='other') Object.assign(e,{otherNote});
      return e;
    };

    if(editId) {
      // 編集: editLogsの各IDをworkListに対応
      const editLogIds = (editLogs&&editLogs.length>0) ? editLogs.map(l=>l.id) : [editId];
      // 既存ログを削除してから再追加
      const removeIds = new Set(editLogIds);
      let allNewLogs = logs.filter(l=>!removeIds.has(l.id));
      // 編集: 施肥複数対応
      const editEntriesAll = [];
      const editGroupId = editLogIds[0] || uid0();
      for(let wi=0;wi<workList.length;wi++){
        const w=workList[wi];
        editEntriesAll.push(makeEntry(w, wi===0, editLogIds[wi], editGroupId));
        if(w==='fert' && fertEntries.length>0){
          fertEntries.forEach((fe,fi)=>{
            const ex=makeEntry('fert',false,editLogIds[workList.length+fi]);
            ex.fertName=fe.name;ex.fertAmt=fe.amt;ex.fertUnit=fe.unit;ex.fertMethod=fe.meth;ex.fertCost=fe.cost;
            editEntriesAll.push(ex);
          });
        }
        if(w==='pest' && pestEntries.length>0){
          const fertExtraCount=fertEntries.length;
          pestEntries.forEach((pe,pi)=>{
            const ex=makeEntry('pest',false,editLogIds[workList.length+fertExtraCount+pi]);
            ex.pestName=pe.name;ex.pestDil=pe.dil;ex.pestSprayAmt=pe.sprayAmt;ex.pestUnit=pe.sprayUnit;ex.pestTarget=pe.tgt;ex.pestCost=pe.cost;
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
      newEntries.forEach(e=>dbSaveLog(e));
      // 削除された余分なエントリをDBから削除
      editLogIds.slice(newEntries.length).forEach(id=>dbDelete('logs',id));
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
            const ex=makeEntry('fert',false,null);
            ex.fertName=fe.name;ex.fertAmt=fe.amt;ex.fertUnit=fe.unit;ex.fertMethod=fe.meth;ex.fertCost=fe.cost;
            allEntriesNew.push(ex);
          });
        }
        // 農薬の追加エントリ
        if(w==='pest' && pestEntries.length>0){
          pestEntries.forEach(pe=>{
            const ex=makeEntry('pest',false,null,newGroupId);
            ex.pestName=pe.name;ex.pestDil=pe.dil;ex.pestSprayAmt=pe.sprayAmt;ex.pestUnit=pe.sprayUnit;ex.pestTarget=pe.tgt;ex.pestCost=pe.cost;
            allEntriesNew.push(ex);
          });
        }
        // 資材の追加エントリ
        if(w==='equip' && equipEntries.length>0){
          equipEntries.forEach(ee=>{
            const ex=makeEntry('equip',false,null,newGroupId);
            const _en2=ee.idx!==""?equips[ee.idx]?.name||'':'';
            const _fa2=(_en2+(_en2?' ':'')+ee.act).trim();
            ex.equipIds=ee.idx!==""?[ee.idx]:[];ex.equipAct=_fa2||ee.act;
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
      newEntries.forEach(e=>dbSaveLog(e));
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
      showToast('記録しました！');
    }
    setSaving(false);
    const kd=keepDate,kc=keepCrop,kf=keepField;
    setWorks(new Set());setMemo('');setLogImg(null);setLogImg2(null);setLogImg3(null);
    setHvGrades({秀品:{kg:'',cnt:'',price:''},優品:{kg:'',cnt:'',price:''},良品:{kg:'',cnt:'',price:''},規格外:{kg:'',cnt:'',price:''}});
    setHvKg('');setHvCnt('');setHvQ('秀品');setHvPrice('');
    setSowQty('');setGermCnt('');setTranspQty('');
    setFertName('');setFertAmt('');setPestName('');setPestDil('');setPestAmt('');
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
    if(allFiles.length > 3){ showToast("写真は3枚までです"); e.target.value=""; return; }
    const files = allFiles.slice(0,3);
    if(!files.length) return;
    const exif = await extractExifDate(files[0]);
    if(exif){setDate(exif.date);setTime(exif.time);showToast("写真から日時を取得しました");}
    const setters = [setLogImg, setLogImg2, setLogImg3];
    for(let i=0;i<files.length;i++){
      const {base64,blob} = await compressImage(files[i]);
      console.log("[handleLogImg] file",i,"blob:",blob?.size,"base64:",base64?.length);
      // blobがnullの場合はbase64からblobを生成
      const finalBlob = blob || await fetch(base64).then(r=>r.blob());
      setters[i]({base64, blob:finalBlob, name:uid0()+'-'+Date.now()+".jpg"});
    }
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
          <button onClick={()=>{setEditId(null);setWork("");setMemo("");setLogImg(null);setLogImg2(null);setLogImg3(null);setHvGrades({秀品:{kg:"",cnt:"",price:""},優品:{kg:"",cnt:"",price:""},良品:{kg:"",cnt:"",price:""},規格外:{kg:"",cnt:"",price:""}});setDate(todayStr());setTime(nowTime());setDur("");setSowQty("");setGermCnt("");setGermDate(todayStr());setTranspQty("");setFertIdx("");setFertName("");setFertAmt("");setFertUnit("kg");setFertMeth("追肥");setFertCost("");setPestIdx("");setPestName("");setPestDil("");setPestAmt("");setPestUnit("L");setPestTgt("");setPestCost("");setDiscardCnt("");setAddCnt("");setEventType("");setEventNote("");setOtherNote("");setHvKg("");setHvCnt("");setHvQ("秀品");setHvPrice("");setRepotSize("");setRepotVol("");setEquipSel([]);setEquipAct("設置");setEquipEntries([]);setWork("");setCropId("");}}
            style={{...S.btn,...S.btnS,...S.btnSm}}>✕ リセット</button>
        )}
      </div>
      <div style={S.card}>
        <R2>
          <FG label="圃場">{fields.length>0?<Sel value={fieldIdx} onChange={v=>{setFieldIdx(parseInt(v));setCropId("");}} options={fields.map((f,i)=>({value:i,label:f.name}))}/>:<div style={{color:TX3,fontSize:".82rem"}}>圃場を登録してください</div>}</FG>
          <FG label="品目"><Sel value={cropId} onChange={setCropId} options={[{value:"",label:"（選択）"},...fieldCrops.filter(c=>!c.ended).map(c=>{const db=CDB[c.type]||{};return{value:c.id,label:(db.e||"🌱")+" "+(c.type==="custom"?c.customName||"カスタム":(db.n||c.type))+(c.variety?" ("+c.variety+")":"")};})]} /></FG>
        </R2>
        <FG label="作業内容">
          <div style={{fontSize:".7rem",color:"#888",marginBottom:4}}>💡 複数選択できます</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
            {WORK_TYPES.map(w=>(
              <button key={w.value} onClick={()=>toggleWork(w.value)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"7px 4px",border:"2px solid "+(works.has(w.value)?G2:BD),borderRadius:10,background:works.has(w.value)?G3:"#fff",fontSize:".62rem",fontWeight:700,color:works.has(w.value)?G:"#5a5040",cursor:"pointer"}}>
                <span style={{fontSize:"1.3rem",lineHeight:1}}>{w.icon}</span><TermTooltip>{w.label}</TermTooltip>
              </button>
            ))}
          </div>
        </FG>
        {works.has("sow")&&<div style={panelStyle("#f0fdf4","#86efac")}>
          <div style={ctitleStyle}>🌰 播種詳細</div>
          <FG label="播種量（粒数・個数）"><Inp type="number" value={sowQty} onChange={setSowQty} placeholder="例：300"/></FG>
        </div>}
        {works.has("germinated")&&<div style={panelStyle("#f0fdf4","#86efac")}><div style={ctitleStyle}>🌱 発芽確認</div><R2><FG label="発芽確認数"><Inp type="number" value={germCnt} onChange={setGermCnt} placeholder="例：250"/></FG><FG label="確認日"><Inp type="date" value={germDate} onChange={setGermDate}/></FG></R2>{sowQty&&germCnt&&<div style={{fontSize:".8rem",color:G,marginTop:4}}>発芽率: {Math.round((parseInt(germCnt)/parseInt(sowQty))*100)}%</div>}</div>}
        {works.has("transplant")&&<div style={panelStyle("#f5f3ff","#c4b5fd")}>
          <div style={ctitleStyle}>🪴 定植詳細</div>
          <FG label="定植株数"><Inp type="number" value={transpQty} onChange={setTranspQty} placeholder="例：120"/></FG>
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
                <Inp type="number" value={repotVol} onChange={setRepotVol} placeholder="自動入力"/>
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
                if(fm){if(fm.cunit||fm.sunit)setFertUnit(fm.cunit||fm.sunit);}
              }} options={[{value:"",label:"（選択）"},...fertMs.map(f=>({value:f.name,label:f.name}))]}/>
            </FG>
            <R2>
              <FG label="施用量"><div style={{display:"flex",gap:4}}><Inp type="number" value={fertAmt} onChange={setFertAmt} style={{flex:1}}/><Sel value={fertUnit} onChange={setFertUnit} options={["kg","g","L","ml","袋"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
              <FG label="施用方法"><Sel value={fertMeth} onChange={setFertMeth} options={["元肥","追肥","葉面散布","かん注"].map(v=>({value:v,label:v}))}/></FG>
            </R2>
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
                  if(fm2)setFertEntries(p=>p.map((x,i)=>i===fi?{...x,unit:fm2.cunit||fm2.sunit||x.unit}:x));
                }} options={[{value:"",label:"（選択）"},...fertMs.map(f=>({value:f.name,label:f.name}))]}/>
              </FG>
              <R2>
                <FG label="施用量"><div style={{display:"flex",gap:4}}><Inp type="number" value={fe.amt} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,amt:v}:x))} style={{flex:1}}/><Sel value={fe.unit} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,unit:v}:x))} options={["kg","g","L","ml","袋"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG>
                <FG label="施用方法"><Sel value={fe.meth} onChange={v=>setFertEntries(p=>p.map((x,i)=>i===fi?{...x,meth:v}:x))} options={["元肥","追肥","葉面散布","かん注"].map(v=>({value:v,label:v}))}/></FG>
              </R2>
            </div>
          ))}
        </div>}
        {works.has("pest")&&<div style={panelStyle("#fffdf0","#f9e4a0")}><div style={ctitleStyle}>🐛 農薬詳細</div>
              <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"8px 10px",marginBottom:9,fontSize:".72rem",color:"#856404",lineHeight:1.6}}>
                ⚠️ 農薬の使用記録は農薬取締法により保管義務があります。本アプリの記録は補助的なものです。法的義務の履行は別途ご確認ください。
              </div><FG label="農薬マスターから選ぶ"><Sel value={pestIdx} onChange={v=>{setPestIdx(v);const pm=v&&pestMs[parseInt(v)];if(pm){setPestName(pm.name);setPestDil(pm.dil||"");if(pm.cunit||pm.sunit)setPestUnit(pm.cunit||pm.sunit);}}} options={[{value:"",label:"手動入力"},...pestMs.map((p,i)=>({value:i,label:p.name}))]}/></FG><FG label="農薬名"><Inp value={pestName} onChange={setPestName} placeholder="農薬名"/></FG><R2><FG label="希釈倍数"><Inp type="number" value={pestDil} onChange={setPestDil} placeholder="1000"/></FG><FG label="散布量"><div style={{display:"flex",gap:4}}><Inp type="number" value={pestAmt} onChange={setPestAmt} style={{flex:1}}/><Sel value={pestUnit} onChange={setPestUnit} options={["L","ml"].map(v=>({value:v,label:v}))} style={{width:60,flex:"none"}}/></div></FG></R2><R2><FG label="対象病害虫"><Inp value={pestTgt} onChange={setPestTgt} placeholder="アブラムシ等"/></FG></R2></div>}
        {works.has("harvest")&&<div style={panelStyle("#fff9f0","#ffd9a0")}>
          <div style={ctitleStyle}>🧺 収穫詳細</div>
          <div style={{fontSize:".72rem",color:"#888",marginBottom:8}}>品質別に入力（入力した品質のみ集計されます）</div>
          {["秀品","優品","良品","規格外"].map(q=>(
            <div key={q} style={{background:"#fffdf5",border:"1px solid #f0e0b0",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{fontSize:".72rem",fontWeight:700,color:"#5c3d1e",marginBottom:5}}>{q}</div>
              <R2>
                <FG label="kg"><Inp type="number" value={hvGrades[q].kg} onChange={v=>setHvGrades(g=>({...g,[q]:{...g[q],kg:v}}))} placeholder="0"/></FG>
                <FG label="個数"><Inp type="number" value={hvGrades[q].cnt} onChange={v=>setHvGrades(g=>({...g,[q]:{...g[q],cnt:v}}))} placeholder="0"/></FG>
                <FG label="単価(円/kg)"><Inp type="number" value={hvGrades[q].price} onChange={v=>setHvGrades(g=>({...g,[q]:{...g[q],price:v}}))} placeholder="0"/></FG>
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
        {works.has("discard")&&<div style={panelStyle("#fef2f2","#fca5a5")}><div style={ctitleStyle}>♻️ 廃棄・株数調整</div><R2><FG label="廃棄株数"><Inp type="number" value={discardCnt} onChange={setDiscardCnt} placeholder="0"/></FG><FG label="追加株数"><Inp type="number" value={addCnt} onChange={setAddCnt} placeholder="0"/></FG></R2></div>}
        
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
            <FG label="作業種別"><Sel value={equipAct} onChange={setEquipAct} options={["設置","撤去","着用","脱去","点検","修理","その他"].map(v=>({value:v,label:v}))}/></FG>
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
                  options={["設置","撤去","着用","脱去","点検","修理","その他"].map(v=>({value:v,label:v}))}/>
              </FG>
            </div>
          ))}
        </div>}
        <FG label="📷 生育状況の写真（撮影日時を自動取得）">
          <div style={{border:"2px dashed "+BD,borderRadius:10,padding:14,textAlign:"center",cursor:"pointer",background:"#fafafa"}} onClick={()=>document.getElementById("logImgInp").click()}>
            <input id="logImgInp" type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{if(Array.from(e.target.files).length>3){showToast("写真は3枚まで選択できます");e.target.value="";return;}handleLogImg(e);}}/>
            <div style={{fontSize:"1.5rem",marginBottom:2}}>📷</div>
            <p style={{fontSize:".72rem",color:TX3}}>タップして写真を追加（撮影日時を自動取得）</p>
          </div>
          {logImg&&(
            <div style={{position:"relative",marginTop:7}}>
              <img src={logImg.base64||logImg} alt="" style={{width:"100%",borderRadius:8,maxHeight:170,objectFit:"cover"}}/>
              <button onClick={()=>setLogImg(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.5)",border:"none",color:"#fff",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:".8rem",lineHeight:"24px",textAlign:"center"}}>✕</button>
            </div>
          )}
          {logImg&&!logImg2&&(
            <div onClick={()=>document.getElementById("logImgInp2").click()}
              style={{marginTop:6,padding:"8px",border:"1.5px dashed #ccc",borderRadius:8,textAlign:"center",cursor:"pointer",fontSize:".72rem",color:TX3}}>
              <input id="logImgInp2" type="file" accept="image/*" style={{display:"none"}} onChange={handleLogImg2}/>
              ＋ 写真2枚目を追加
            </div>
          )}
          {logImg2&&(
            <div style={{position:"relative",marginTop:6}}>
              <img src={logImg2.base64||logImg2} alt="" style={{width:"100%",borderRadius:8,maxHeight:170,objectFit:"cover"}}/>
              <button onClick={()=>setLogImg2(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.5)",border:"none",color:"#fff",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:".8rem",lineHeight:"24px",textAlign:"center"}}>✕</button>
            </div>
          )}
          {logImg2&&!logImg3&&(
            <div onClick={()=>document.getElementById("logImgInp3").click()}
              style={{marginTop:6,padding:"8px",border:"1.5px dashed #ccc",borderRadius:8,textAlign:"center",cursor:"pointer",fontSize:".72rem",color:TX3}}>
              <input id="logImgInp3" type="file" accept="image/*" style={{display:"none"}} onChange={handleLogImg3}/>
              ＋ 写真3枚目を追加
            </div>
          )}
          {logImg3&&(
            <div style={{position:"relative",marginTop:6}}>
              <img src={logImg3.base64||logImg3} alt="" style={{width:"100%",borderRadius:8,maxHeight:170,objectFit:"cover"}}/>
              <button onClick={()=>setLogImg3(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.5)",border:"none",color:"#fff",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:".8rem",lineHeight:"24px",textAlign:"center"}}>✕</button>
            </div>
          )}
        </FG>
        <R2><FG label="作業日"><Inp type="date" value={date} onChange={setDate}/></FG><FG label="作業時刻"><Inp type="time" value={time} onChange={setTime}/></FG></R2>
        <FG label="作業時間（分）"><Inp type="number" value={dur} onChange={setDur} placeholder="30"/></FG>
        <FG label="メモ・気づき"><TA value={memo} onChange={setMemo} placeholder="天候・生育状態・気づいたことなど…"/></FG>

      </div>
    </div>
  );
}

// TIMELINE
function TimelineScreen({ fields, crops, equips, logs, setLogs, setLogsR, showToast, onEdit, onNew, onCopy }) {
  const [q,    setQ]    = useState("");
  const [fW,   setFW]   = useState("");
  const [selCropId, setSelCropId] = useState(""); // 品目フィルタ
  const [openDd, setOpenDd] = useState(false);    // 品目ドロップダウン
  const [ddPos,  setDdPos]  = useState({top:0,left:0,above:false});
  const ddBtnRef = useRef(null);

  // ひらがな↔カタカナ変換
  const toHira = s => s.replace(/[\u30a1-\u30f6]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  const toKata = s => s.replace(/[\u3041-\u3096]/g, c=>String.fromCharCode(c.charCodeAt(0)+0x60));
  const matchQ = (text, word) => {
    const t=text.toLowerCase(), w=word.toLowerCase();
    return toHira(t).includes(toHira(w)) || toKata(t).includes(toKata(w)) || t.includes(w);
  };

  const WORK_LABELS = {sow:'播種',germinated:'発芽確認',transplant:'定植',water:'水やり',fert:'施肥',pest:'防除',pruning:'剪定',thinning:'摘果・摘花',sideshot:'脇芽かき',repot:'植え替え',event:'生育記録',harvest:'収穫',discard:'廃棄',equip:'資材作業',check:'見回り',other:'その他',end:'栽培終了'};

  // フィルタ済みログ
  const filtered = logs.filter(l=>{
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
  const grouped = [];
  filtered.forEach(l=>{
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



      {/* 日付グループ別表示 */}
      {!grouped.length&&<div style={{color:TX3,fontSize:'.82rem',padding:16,textAlign:'center'}}>記録がありません</div>}
      {grouped.map(g=>(
        <div key={g.date} style={{marginBottom:16}}>
          {/* 日付ヘッダー */}
          <div style={{fontSize:'.72rem',fontWeight:700,color:'#5c3d1e',padding:'4px 2px',borderBottom:'2px solid #e0d9ce',marginBottom:8}}>
            📅 {fmtYMD(g.date)}
          </div>
          {/* 品目・圃場でグループ化して表示 */}
          {groupDayLogs(g.logs).map(card=>{
            const l0=card.logs[0];
            const cr=crops.find(c=>c.id===l0.cropId)||{};
            const db=CDB[cr.type]||{};
            const fieldName=fields[l0.fieldIdx]?.name||'';
            // 全logsから写真収集（farm.htmlと同じ方式）
            const photos=[];
            card.logs.forEach(l=>{[l.imgSrc,l.imgSrc2,l.imgSrc3].forEach(s=>{if(s&&photos.length<3)photos.push(s);});});
            // メモ（logsから探す）
            const memoLog=card.logs.find(l=>l.memo);
            // 作業タグ（WORK_TYPES順・重複排除）
            const seenW=new Set();
            const sortedLogs=[...card.logs].sort((a,b)=>{
              const oa=WORK_TYPES.findIndex(w=>w.value===a.work);
              const ob=WORK_TYPES.findIndex(w=>w.value===b.work);
              return (oa<0?99:oa)-(ob<0?99:ob);
            }).filter(l=>{ if(seenW.has(l.work))return false; seenW.add(l.work); return true; });
            return (
              <div key={card.key} style={{...S.card,padding:0,overflow:'hidden',marginBottom:8}}>
                <div style={{padding:'9px 11px'}}>
                  {/* 品目名 */}
                  <div style={{fontSize:'.84rem',fontWeight:700,color:'#1c1a14',marginBottom:4}}>
                    {db.e||'🌱'} {cr.type==='custom'?(cr.customName||'カスタム'):(db.n||cr.type)}{cr.variety?` (${cr.variety})`:''}
                  </div>
                  {/* 圃場・時間 */}
                  <div style={{fontSize:'.7rem',color:TX3,marginBottom:5,display:'flex',gap:8}}>
                    {fieldName&&<span>📍{fieldName}</span>}
                    {l0.time&&<span>🕐{l0.time}</span>}
                  </div>
                  {/* 作業タグ */}
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:5}}>
                    {sortedLogs.map((l,i)=>{
                      const w=WORK[l.work]||{label:l.work||'',tag:'gray',icon:'📝'};
                      return <Tag key={i} type={w.tag}>{w.icon} {w.label}{l.otherNote?' '+l.otherNote:''}</Tag>;
                    })}
                  </div>
                  {/* 詳細（farm.htmlと同じ順序） */}
                  {card.logs.map((l,li)=>(
                    <div key={li}>
                      {l.fertName&&<div style={{fontSize:'.75rem',color:'#065f46'}}>🌿 {l.fertName}{l.fertAmt?` ${l.fertAmt}${l.fertUnit||''}`:''}{l.fertMethod?` (${l.fertMethod})`:''}</div>}
                      {l.pestName&&<div style={{fontSize:'.75rem',color:'#92400e'}}>🐛 {l.pestName}{l.pestDil?` ${l.pestDil}倍`:''}{l.pestSprayAmt?` 散布${l.pestSprayAmt}${l.pestUnit||''}`:''}{l.pestTarget?` 対象:${l.pestTarget}`:''}</div>}
                      {(l.hvKg||l.hvCnt)&&<div style={{fontSize:'.75rem',color:'#059669'}}>🧺 {l.hvGradeStr||`${l.hvKg||''}${l.hvKg?'kg':''}${l.hvCnt?` ${l.hvCnt}個`:''}`}</div>}
                      {l.sowQty&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>🌰 播種 {l.sowQty}粒</div>}
                      {l.germinationCnt&&<div style={{fontSize:'.75rem',color:'#065f46'}}>🌱 発芽 {l.germinationCnt}粒{l.germinationDate?` (${fmtMD(l.germinationDate)})`:''}</div>}
                      {l.transplantQty&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>🪴 定植 {l.transplantQty}株</div>}
                      {l.eventType&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>📋 {l.eventType}{l.eventNote?` · ${l.eventNote}`:''}</div>}
                      {(l.discardCnt||l.addCnt)&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>📊 株数調整{l.addCnt?` +${l.addCnt}株`:''}{ l.discardCnt?` -${l.discardCnt}株（廃棄）`:''}</div>}
                      {l.equipAct&&<div style={{fontSize:'.75rem',color:'#5b21b6'}}>{l.equipAct}</div>}
                      {l.otherNote&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>✏️ {l.otherNote}</div>}
                      {l.work==='repot'&&(l.repotSize||l.repotVol)&&<div style={{fontSize:'.75rem',color:'#7c3aed'}}>🪴 {l.repotSize?l.repotSize+'号鉢':''}{l.repotVol?` ${l.repotVol}L`:''}</div>}
                    </div>
                  ))}
                  {/* 作業時間は1回だけ表示 */}
                  {l0.duration&&<div style={{fontSize:'.72rem',color:'#aaa',marginTop:2}}>⏱ {l0.duration}分</div>}
                  {/* メモ（後方） */}
                  {memoLog?.memo&&<div style={{fontSize:'.78rem',color:'#5a5040',marginTop:4,lineHeight:1.5}}>{memoLog.memo}</div>}
                </div>
                {/* 写真 */}
                {photos.length>0&&(
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:photos.length===1?'1fr':photos.length===2?'1fr 1fr':'1fr 1fr 1fr',
                    gap:2
                  }}>
                    {photos.map((src,i)=>(
                      <img key={i} src={src} alt="" style={{
                        width:'100%',
                        height:photos.length===1?'200px':photos.length===2?'150px':'110px',
                        objectFit:'cover',display:'block',cursor:'pointer'
                      }}
                        onClick={()=>openLb(photos,i)}/>
                    ))}
                  </div>
                )}
                {/* 操作ボタン */}
                <div style={{display:'flex',gap:6,padding:'6px 11px',borderTop:'1px solid #f0ebe3'}}>
                  <button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>onEdit(card.logs)}>✏️ 編集</button>
                  <button style={{...S.btn,...{background:"#f59e0b",color:"#fff",padding:"4px 10px",fontSize:".7rem",borderRadius:8,width:"auto",display:"inline-block"}}} onClick={()=>onCopy&&onCopy(card.logs)}>📋 コピー</button>
                  {card.logs.length===1
                    ? <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{if(!window.confirm('削除?'))return;dbDelete('logs',card.logs[0].id);setLogsR(prev=>prev.filter(x=>x.id!==card.logs[0].id));showToast('削除しました');}}>削除</button>
                    : <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{if(!window.confirm('削除?'))return;const ids=new Set(card.logs.map(l=>l.id));ids.forEach(id=>dbDelete('logs',id));setLogsR(prev=>prev.filter(x=>!ids.has(x.id)));showToast('削除しました');}}>削除</button>
                  }
                </div>
              </div>
            );
          })}

        </div>
      ))}

      {/* 外クリックでドロップダウン閉じる */}
      {openDd&&<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9998}} onClick={()=>setOpenDd(false)}/>}
      
    </div>
  );
}

function CostScreen({ fields, crops, fertMs, pestMs, equips, costs, setCosts, logs, showToast }) {
  const [mCost,setMCost]=useState(null);
  const [filterCrop,setFilterCrop]=useState("");  // 品目フィルター（""=全て, "__common"=共通費）
  const [filterCat,setFilterCat]=useState("");     // カテゴリフィルター
  const [sortKey,setSortKey]=useState("date");     // 並べ替えキー: date/cat/amt/crop
  const [sortAsc,setSortAsc]=useState(false);      // 昇順か
  const toggleSort=k=>{ if(sortKey===k){setSortAsc(a=>!a);}else{setSortKey(k);setSortAsc(k==="date"?false:true);} };
  const empty={id:uid0(),cat:"seed",name:"",amt:"",date:todayStr(),qty:"",qunit:"",fieldIdx:"",cropId:"",note:""};
  const total=costs.reduce((s,c)=>s+(parseFloat(c.amt)||0),0);
  const revenue=logs.reduce((s,l)=>s+(parseFloat(l.hvKg)||0)*(parseFloat(l.hvPrice)||0),0);
  const totalHv=logs.reduce((s,l)=>s+(parseFloat(l.hvKg)||0),0);
  const byCat=Object.fromEntries(COST_CATS.map(c=>[c.value,0]));
  costs.forEach(c=>{if(byCat[c.cat]!==undefined)byCat[c.cat]+=(parseFloat(c.amt)||0);});
  const maxC=Math.max(...Object.values(byCat),1);
  const sv=()=>{ const item={...mCost,id:mCost.id||uid0()}; const n=mCost._idx!==undefined?costs.map((x,i)=>i===mCost._idx?item:x):[...costs,item]; setCosts(n,item);setMCost(null);showToast("保存しました"); };
  const catItems=mCost?(mCost.cat==="fert"?fertMs:mCost.cat==="pest"?pestMs:mCost.cat==="equip"?equips:[]):[];
  return (
    <div style={S.scr} className="scr-inner">
      <div style={S.sec}><span>💰 費用管理</span><button style={S.secBtn} onClick={()=>setMCost({...empty})}>＋ 費用追加</button></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:9}}>
        {[{n:Math.round(total).toLocaleString()+"円",l:"総支出",c:ALERT},{n:Math.round(revenue).toLocaleString()+"円",l:"推定収益",c:INFO},{n:Math.round(revenue-total).toLocaleString()+"円",l:"損益",c:revenue-total>=0?G:ALERT},{n:totalHv.toFixed(1)+"kg",l:"累計収穫量",c:G}].map((s,i)=>(
          <div key={i} style={{...S.card,textAlign:"center"}}><div style={{fontSize:"1.65rem",fontWeight:700,color:s.c,lineHeight:1}}>{s.n}</div><div style={{fontSize:".66rem",color:TX3,marginTop:3}}>{s.l}</div></div>
        ))}
      </div>
      <div style={S.card}><div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>カテゴリ別支出</div>
        {COST_CATS.map(cat=>(
          <div key={cat.value} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
            <div style={{fontSize:".7rem",minWidth:96,textAlign:"right"}}>{cat.label}</div>
            <div style={{flex:1,background:"#eee",borderRadius:999,height:8,overflow:"hidden"}}><div style={{height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+G+","+G2+")",width:Math.round(byCat[cat.value]/maxC*100)+"%",transition:"width .7s ease"}}/></div>
            <div style={{fontSize:".68rem",color:TX3,minWidth:60}}>{Math.round(byCat[cat.value]).toLocaleString()}円</div>
          </div>
        ))}
      </div>
      <div style={S.card}><div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>費用一覧</div>
        {/* フィルター */}
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          <Sel value={filterCrop} onChange={setFilterCrop} style={{flex:"1 1 45%",fontSize:".78rem"}}
            options={[{value:"",label:"🌱 全ての品目"},{value:"__common",label:"📦 共通費（未割当）"},...crops.map(c=>{const db=CDB[c.type]||{};return{value:c.id,label:(db.e||"🌱")+" "+(c.type==="custom"?c.customName||"カスタム":db.n||c.type)+(c.variety?"("+c.variety+")":"")};})]}/>
          <Sel value={filterCat} onChange={setFilterCat} style={{flex:"1 1 45%",fontSize:".78rem"}}
            options={[{value:"",label:"全カテゴリ"},...COST_CATS]}/>
        </div>
        {/* フィルター中の合計 */}
        {(filterCrop||filterCat)&&(()=>{
          const fc=costs.filter(c=>{if(filterCat&&c.cat!==filterCat)return false;if(filterCrop==="__common")return !c.cropId;if(filterCrop&&c.cropId!==filterCrop)return false;return true;});
          const ft=fc.reduce((s,c)=>s+(parseFloat(c.amt)||0),0);
          return <div style={{fontSize:".78rem",color:G,background:G3,borderRadius:8,padding:"6px 10px",marginBottom:8}}>該当 {fc.length}件 · 合計 {Math.round(ft).toLocaleString()}円</div>;
        })()}
        {!costs.length&&<div style={{color:TX3,fontSize:".82rem"}}>費用がまだ登録されていません</div>}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:".76rem"}}>
          {costs.length>0&&<thead><tr>{[{l:"日付",k:"date"},{l:"種別",k:"cat"},{l:"品名",k:null},{l:"品目",k:"crop"},{l:"金額",k:"amt"},{l:"操作",k:null}].map(h=><th key={h.l} onClick={()=>h.k&&toggleSort(h.k)} style={{background:G3,color:G,padding:"5px 6px",textAlign:"left",fontSize:".68rem",cursor:h.k?"pointer":"default",whiteSpace:"nowrap"}}>{h.l}{h.k&&sortKey===h.k?(sortAsc?" ▲":" ▼"):""}</th>)}</tr></thead>}
          <tbody>{[...costs].filter(c=>{
            if(filterCat&&c.cat!==filterCat)return false;
            if(filterCrop==="__common")return !c.cropId;
            if(filterCrop&&c.cropId!==filterCrop)return false;
            return true;
          }).sort((a,b)=>{
            let r=0;
            if(sortKey==="date") r=(a.date||"").localeCompare(b.date||"");
            else if(sortKey==="cat") r=(a.cat||"").localeCompare(b.cat||"");
            else if(sortKey==="amt") r=(parseFloat(a.amt)||0)-(parseFloat(b.amt)||0);
            else if(sortKey==="crop"){
              const an=a.cropId?(CDB[crops.find(x=>x.id===a.cropId)?.type]?.n||"zzz"):"zzz共通";
              const bn=b.cropId?(CDB[crops.find(x=>x.id===b.cropId)?.type]?.n||"zzz"):"zzz共通";
              r=an.localeCompare(bn);
            }
            return sortAsc?r:-r;
          }).map((c,ri)=>{const oi=costs.indexOf(c);return<tr key={ri}><td style={{padding:"5px 6px",borderBottom:"1px solid "+BD}}>{c.date?fmtYMD(c.date):"—"}</td><td style={{padding:"5px 6px",borderBottom:"1px solid "+BD}}>{COST_CATS.find(x=>x.value===c.cat)?.label||c.cat}</td><td style={{padding:"5px 6px",borderBottom:"1px solid "+BD}}>{c.name}</td><td style={{padding:"5px 6px",borderBottom:"1px solid "+BD,fontSize:".7rem",color:c.cropId?"#2d6a3f":"#aaa"}}>{(()=>{if(!c.cropId)return"共通";const cr=crops.find(x=>x.id===c.cropId);if(!cr)return"共通";const db=CDB[cr.type]||{};return(db.e||"🌱")+(cr.type==="custom"?cr.customName||"":db.n||cr.type);})()}</td><td style={{padding:"5px 6px",borderBottom:"1px solid "+BD}}><b>{Math.round(c.amt||0).toLocaleString()}円</b></td><td style={{padding:"5px 6px",borderBottom:"1px solid "+BD,whiteSpace:"nowrap"}}><button style={{...S.btn,...S.btnS,...S.btnSm}} onClick={()=>setMCost({...c,_idx:oi})}>編集</button> <button style={{...S.btn,...S.btnR,...S.btnSm}} onClick={()=>{if(!window.confirm("削除しますか?"))return;dbDelete("costs",c.id);setCosts(costs.filter((_,j)=>j!==oi));showToast("削除しました");}}>削除</button></td></tr>;})}
          </tbody>
        </table>
      </div>
      <ModalWithSave open={!!mCost} onSave={sv} onClose={()=>setMCost(null)} title={mCost?._idx!==undefined?"費用を編集":"購入費用を登録"}>
        {mCost&&<><FG label="カテゴリ"><Sel value={mCost.cat} onChange={v=>setMCost({...mCost,cat:v})} options={COST_CATS}/></FG>{catItems.length>0&&<FG label="品目から選ぶ"><Sel value="" onChange={v=>{const item=catItems[parseInt(v)];if(item)setMCost({...mCost,name:item.name,...(mCost.cat==="equip"?{amt:item.price||""}:{})});}} options={[{value:"",label:"手動入力"},...catItems.map((x,i)=>({value:i,label:x.name}))]}/></FG>}<FG label="品名"><Inp value={mCost.name} onChange={v=>setMCost({...mCost,name:v})} placeholder="例：トマト種子"/></FG><R2><FG label="金額（円）"><Inp type="number" value={mCost.amt} onChange={v=>setMCost({...mCost,amt:v})}/></FG><FG label="購入日"><Inp type="date" value={mCost.date} onChange={v=>setMCost({...mCost,date:v})}/></FG></R2><R2><FG label="数量"><Inp type="number" value={mCost.qty} onChange={v=>setMCost({...mCost,qty:v})}/></FG><FG label="単位"><Inp value={mCost.qunit} onChange={v=>setMCost({...mCost,qunit:v})} placeholder="袋"/></FG></R2><FG label="関連圃場"><Sel value={mCost.fieldIdx} onChange={v=>setMCost({...mCost,fieldIdx:v})} options={[{value:"",label:"全体"},...fields.map((f,i)=>({value:i,label:f.name}))]}/></FG>
        <FG label="品目に割り当て（任意・未割当は共通費）">
          <Sel value={mCost.cropId||""} onChange={v=>setMCost({...mCost,cropId:v})}
            options={[{value:"",label:"未割当（共通費）"},...crops.map(c=>{const db=CDB[c.type]||{};return{value:c.id,label:(db.e||"🌱")+" "+(c.type==="custom"?c.customName||"カスタム":db.n||c.type)+(c.variety?"("+c.variety+")":"")+(c.ended?"（終了）":"")};})]}/>
        </FG><FG label="メモ"><Inp value={mCost.note} onChange={v=>setMCost({...mCost,note:v})}/></FG></>}
      </ModalWithSave>
    </div>
  );
}


// PLAN (栽培計画 - ガントチャート)
function PlanScreen({ fields, crops, plots, setPlots, setPlotsR, showToast }) {
  const [selFieldIdx, setSelFieldIdx] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mPlant, setMPlant] = useState(null);  // 作付け編集モーダル
  const [drag, setDrag] = useState(null);     // ドラッグ中 {id, mode:"move"|"start"|"end", startX, origPlant, origHarvest}
  const laneRef = useRef(null);                // ガント行の幅取得用

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
  const cropFull = c => { if(!c) return ""; const db=CDB[c.type]||{}; const nm=c.type==="custom"?(c.customName||"カスタム"):(db.n||c.type); return (db.e||"🌱")+" "+nm+(c.variety?"("+c.variety+")":""); };

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

  const savePlan = (updated) => {
    const n = plots.map(p=>p.id===updated.id?updated:p);
    setPlots(n, updated);
  };

  // ガントバーのドラッグ（伸縮・移動）
  const yearStartMs = ()=> new Date(year,0,1).getTime();
  const yearSpanMs  = ()=> new Date(year,11,31).getTime()-new Date(year,0,1).getTime();
  const pxToDays = (dx)=>{
    const w = laneRef.current?.offsetWidth || 1;
    const msPerPx = yearSpanMs()/w;
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
      const cur=(plots.find(p=>p.id===plan.id)?.plantings||[]).find(p=>p.id===drag.id);
      if(cur && drag.moved){ savePlan(plots.find(p=>p.id===plan.id)); showToast("期間を変更しました"); }
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

  // 作付けの保存
  const savePlanting = () => {
    if(!mPlant.cropId){ showToast("品目を選択してください"); return; }
    if(!mPlant.plantDate){ showToast("定植日を入力してください"); return; }
    const pl={...mPlant, id:mPlant.id||uid0()};
    const exists=(plan.plantings||[]).some(x=>x.id===pl.id);
    const plantings=exists?plan.plantings.map(x=>x.id===pl.id?pl:x):[...(plan.plantings||[]),pl];
    savePlan({...plan, plantings});
    setMPlant(null);
    showToast("保存しました");
  };
  const deletePlanting = (id) => {
    savePlan({...plan, plantings:plan.plantings.filter(x=>x.id!==id)});
    setMPlant(null);
    showToast("削除しました");
  };

  // 収穫予定日を品目から自動計算
  const calcHarvest = (cropId, plantDate) => {
    if(!plantDate) return "";
    const c=crops.find(x=>x.id===cropId);
    const db=c?CDB[c.type]||{}:{};
    const days=db.maturity?.[c?.maturity||"mid"]||db.d||90;
    const d=new Date(plantDate); d.setDate(d.getDate()+days);
    return d.toISOString().slice(0,10);
  };

  // 連作チェック：同じ区画で前作と次作が同じNG科＆間隔がNG年数未満
  const checkPlanRotation = () => {
    const warns=[];
    if(!plan) return warns;
    (plan.beds||[]).forEach(bed=>{
      const items=(plan.plantings||[]).filter(p=>p.bedId===bed.id&&p.plantDate)
        .map(p=>{const c=crops.find(x=>x.id===p.cropId);return{...p,crop:c,fam:c?FAMILY_DB[c.type]:null,rot:c?ROTATION_DB[c.type]:null};})
        .sort((a,b)=>a.plantDate.localeCompare(b.plantDate));
      for(let i=0;i<items.length;i++){
        for(let j=0;j<i;j++){
          const cur=items[i], past=items[j];
          if(!cur.rot||cur.rot.years<=0||!cur.rot.ng.length)continue;
          if(!cur.fam||!past.fam)continue;
          if(!cur.rot.ng.includes(past.fam))continue;
          const gapYears=(new Date(cur.plantDate)-new Date(past.plantDate))/(86400000*365);
          if(gapYears<cur.rot.years){
            warns.push({bed:bed.name, cur:cropFull(cur.crop), past:cropFull(past.crop), fam:cur.fam, years:cur.rot.years, gap:Math.floor(gapYears*10)/10});
          }
        }
      }
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
  const datePct=d=>{const t=new Date(d).getTime();return Math.max(0,Math.min(100,(t-yearStart)/yearSpan*100));};
  const warns=checkPlanRotation();

  return (
    <div style={S.scr} className="scr-inner">
      <div style={{...S.sec,flexWrap:"wrap",gap:6}}>
        <span>📅 栽培計画</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setYear(y=>y-1)} style={{...S.btn,...S.btnS,...S.btnSm}}>‹</button>
          <span style={{fontSize:".82rem",fontWeight:700,minWidth:46,textAlign:"center"}}>{year}年</span>
          <button onClick={()=>setYear(y=>y+1)} style={{...S.btn,...S.btnS,...S.btnSm}}>›</button>
        </div>
      </div>

      <FG label="圃場を選択"><Sel value={selFieldIdx} onChange={v=>setSelFieldIdx(parseInt(v))} options={fields.map((f,i)=>({value:i,label:f.name}))}/></FG>

      {/* 連作警告 */}
      {warns.length>0&&<div style={{...S.card,background:"#fff3cd",border:"1px solid #ffc107"}}>
        <div style={{fontSize:".76rem",fontWeight:700,color:"#856404",marginBottom:4}}>⚠️ 連作注意（{warns.length}件）</div>
        {warns.slice(0,6).map((w,i)=>(
          <div key={i} style={{fontSize:".7rem",color:"#856404",lineHeight:1.5}}>
            ・{w.bed}: {w.cur}（{w.fam}）。前作{w.past}から{w.gap}年（{w.years}年空けるのが目安）
          </div>
        ))}
      </div>}

      {/* ガントチャート */}
      <div style={{...S.card,overflowX:"auto",WebkitOverflowScrolling:"touch",padding:"10px 8px"}}>
        <div className="no-select" style={{minWidth:560,userSelect:"none",WebkitUserSelect:"none"}}>
          {/* 月ヘッダー */}
          <div style={{display:"flex",borderBottom:"2px solid #e0d9ce",marginBottom:4}}>
            <div style={{width:70,flexShrink:0,fontSize:".68rem",fontWeight:700,color:"#5c3d1e"}}>区画</div>
            <div ref={laneRef} style={{flex:1,display:"flex"}}>
              {months.map(m=>(<div key={m} style={{flex:1,fontSize:".62rem",color:TX3,textAlign:"center",borderLeft:"1px solid #f0ebe3"}}>{m}月</div>))}
            </div>
          </div>
          {/* 区画ごとの行 */}
          {(plan.beds||[]).map(bed=>{
            const items=(plan.plantings||[]).filter(p=>p.bedId===bed.id&&p.plantDate);
            // 重なる作付けをレーン（行）に振り分け（混植・連続作付けを縦積み表示）
            const sorted=[...items].sort((a,b)=>(a.plantDate||"").localeCompare(b.plantDate||""));
            const lanes=[];  // 各レーンの最後の収穫日
            const laneOf={};
            sorted.forEach(pl=>{
              const hv=pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
              let placed=-1;
              for(let li=0;li<lanes.length;li++){ if(pl.plantDate>=lanes[li]){ placed=li; break; } }
              if(placed<0){ placed=lanes.length; lanes.push(hv); } else { lanes[placed]=hv; }
              laneOf[pl.id]=placed;
            });
            const laneCount=Math.max(1,lanes.length);
            const rowH=laneCount*30+8;
            return (
              <div key={bed.id} data-bedrow={bed.id} style={{display:"flex",alignItems:"stretch",borderBottom:"1px solid #f0ebe3",minHeight:rowH}}>
                <div style={{width:70,flexShrink:0,fontSize:".7rem",display:"flex",flexDirection:"column",justifyContent:"center",paddingRight:4}}>
                  <span onClick={()=>renameBed(bed.id)} style={{fontWeight:700,cursor:"pointer",color:"#5c3d1e"}}>{bed.name}</span>
                  <div style={{display:"flex",gap:3,marginTop:2}}>
                    <button onClick={()=>setMPlant({bedId:bed.id,cropId:"",plantDate:"",harvestDate:"",year})} style={{fontSize:".6rem",border:"none",background:G3,color:G,borderRadius:5,padding:"1px 5px",cursor:"pointer"}}>＋作付け</button>
                    <button onClick={()=>deleteBed(bed.id)} style={{fontSize:".6rem",border:"none",background:"#fee2e2",color:"#b91c1c",borderRadius:5,padding:"1px 4px",cursor:"pointer"}}>×</button>
                  </div>
                </div>
                <div style={{flex:1,position:"relative",borderLeft:"1px solid #f0ebe3"}}>
                  {/* 月の区切り線 */}
                  {months.map(m=>(<div key={m} style={{position:"absolute",left:((m-1)/12*100)+"%",top:0,bottom:0,width:1,background:"#f5f0e8"}}/>))}
                  {/* 作付けバー */}
                  {items.map(pl=>{
                    const c=crops.find(x=>x.id===pl.cropId);
                    if(!c)return null;
                    const hv=pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
                    const left=datePct(pl.plantDate);
                    const right=datePct(hv);
                    const width=Math.max(3,right-left);
                    // 表示年でフィルタ
                    const py=new Date(pl.plantDate).getFullYear();
                    const hy=new Date(hv).getFullYear();
                    if(hy<year||py>year)return null;
                    return (
                      <div key={pl.id} className="gantt-bar"
                        style={{position:"absolute",left:left+"%",width:width+"%",top:(4+(laneOf[pl.id]||0)*30),height:26,background:cropColorByType(c.type),borderRadius:5,display:"flex",alignItems:"center",fontSize:".62rem",color:"#fff",overflow:"hidden",whiteSpace:"nowrap",boxShadow:"0 1px 3px rgba(0,0,0,.2)",touchAction:"none"}}>
                        {/* 左端ハンドル（開始日伸縮）*/}
                        <div onMouseDown={e=>onDragStart(e,pl,"start")} onTouchStart={e=>onDragStart(e,pl,"start")}
                          style={{width:8,height:"100%",cursor:"ew-resize",flexShrink:0,background:"rgba(255,255,255,.25)"}}/>
                        {/* 中央（移動 or タップで編集）*/}
                        <div onMouseDown={e=>onDragStart(e,pl,"move")} onTouchStart={e=>onDragStart(e,pl,"move")}
                          onClick={()=>{ if(!drag||!drag.moved) setMPlant({...pl,year}); }}
                          style={{flex:1,height:"100%",display:"flex",alignItems:"center",paddingLeft:3,cursor:"grab",overflow:"hidden"}}>
                          {cropFull(c)}
                        </div>
                        {/* 右端ハンドル（収穫日伸縮）*/}
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
      <button style={{...S.btn,...S.btnS,marginTop:8}} onClick={addBed}>＋ 区画を追加</button>

      {/* 凡例 */}
      <div style={{...S.card,marginTop:8}}>
        <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:6}}>作付け一覧（{year}年）</div>
        {(()=>{
          const all=(plan.plantings||[]).filter(p=>{const hv=p.harvestDate||calcHarvest(p.cropId,p.plantDate);return new Date(hv).getFullYear()>=year&&new Date(p.plantDate).getFullYear()<=year;}).sort((a,b)=>(b.plantDate||"").localeCompare(a.plantDate||""));
          if(!all.length)return <div style={{fontSize:".72rem",color:TX3}}>作付けがありません。区画の「＋作付け」から追加してください</div>;
          return all.map(pl=>{
            const c=crops.find(x=>x.id===pl.cropId);if(!c)return null;
            const bed=plan.beds.find(b=>b.id===pl.bedId);
            const hv=pl.harvestDate||calcHarvest(pl.cropId,pl.plantDate);
            const rot=ROTATION_DB[c.type];
            return (
              <div key={pl.id} onClick={()=>setMPlant({...pl,year})} style={{display:"flex",alignItems:"center",gap:8,fontSize:".74rem",padding:"6px 0",borderBottom:"1px solid #f0ebe3",cursor:"pointer"}}>
                <span style={{display:"inline-block",width:12,height:12,borderRadius:3,background:cropColorByType(c.type),flexShrink:0}}/>
                <span style={{flex:1}}>{cropLabel(c.type)}{c.variety?"("+c.variety+")":""}</span>
                <span style={{color:TX3,fontSize:".68rem"}}>{bed?.name} · {fmtMD(pl.plantDate)}〜{fmtMD(hv)}</span>
                {rot&&rot.years>0&&<span style={{fontSize:".64rem",color:"#856404",background:"#fff3cd",borderRadius:5,padding:"1px 5px"}}>連作{rot.years}年</span>}
              </div>
            );
          });
        })()}
      </div>

      {/* 作付け編集モーダル */}
      <ModalWithSave open={!!mPlant} onClose={()=>setMPlant(null)} title={mPlant?.id?"作付けを編集":"作付けを追加"} onSave={savePlanting}>
        {mPlant&&<>
          <FG label="区画（変更で別区画へ移動）"><Sel value={mPlant.bedId} onChange={v=>setMPlant({...mPlant,bedId:v})} options={(plan.beds||[]).map(b=>({value:b.id,label:b.name}))}/></FG>
          <FG label="品目">
            <Sel value={mPlant.cropId} onChange={v=>{const hv=calcHarvest(v,mPlant.plantDate);setMPlant({...mPlant,cropId:v,harvestDate:hv});}}
              options={[{value:"",label:"（選択）"},...crops.filter(c=>!c.ended).map(c=>{const db=CDB[c.type]||{};return{value:c.id,label:(db.e||"🌱")+" "+(c.type==="custom"?c.customName||"カスタム":db.n||c.type)+(c.variety?"("+c.variety+")":"")};})]}/>
          </FG>
          <R2>
            <FG label="定植・播種日"><Inp type="date" value={mPlant.plantDate} onChange={v=>{const hv=calcHarvest(mPlant.cropId,v);setMPlant({...mPlant,plantDate:v,harvestDate:hv});}}/></FG>
            <FG label="収穫予定日"><Inp type="date" value={mPlant.harvestDate} onChange={v=>setMPlant({...mPlant,harvestDate:v})}/></FG>
          </R2>
          <div style={{fontSize:".68rem",color:TX3,marginBottom:8,lineHeight:1.5}}>💡 品目と定植日を選ぶと収穫予定日を自動計算します（手動で調整可）<br/>同じ区画に同時期の作付けを複数追加すると、混植として縦に並べて表示されます</div>
          {mPlant.id&&<button onClick={()=>deletePlanting(mPlant.id)} style={{...S.btn,...S.btnR,marginTop:4}}>この作付けを削除</button>}
        </>}
      </ModalWithSave>
    </div>
  );
}

function ReportScreen({ fields, crops, logs, costs, fertMs, pestMs, equips=[] }) {
  const [selCropId, setSelCropId] = useState("all");
  const [period,    setPeriod]    = useState("year");  // "year" or "month"
  const [selYear,   setSelYear]   = useState(new Date().getFullYear());
  const [selMonth,  setSelMonth]  = useState(new Date().getMonth()+1);

  // 利用可能な年・月リスト
  const allDates = [...logs, ...costs].map(x=>x.date||'').filter(Boolean);
  const years = [...new Set(allDates.map(d=>d.slice(0,4)).filter(Boolean))].sort().reverse();
  const months = period==="month" ? [...new Set(
    allDates.filter(d=>d.startsWith(String(selYear))).map(d=>d.slice(5,7))
  )].sort().reverse().map(Number) : [];

  // 期間フィルター関数
  const inPeriod = date => {
    if(!date) return false;
    if(period==="crop") {
      return true; // 栽培期間モードは日付制限なし・全期間表示
    }
    if(period==="year") return date.startsWith(String(selYear));
    return date.startsWith(String(selYear)+"-"+String(selMonth).padStart(2,"0"));
  };
  // 費用の計上額を返す（減価償却資産は期間内なら年額、それ以外は購入額）
  const costAmount = (co) => {
    const full = parseFloat(co.amt)||0;
    const dep = parseInt(co.depYears)||0;
    if(dep<=0) return inPeriod(co.date)?full:0;  // 通常費用：購入日が期間内のみ
    // 減価償却：購入年から dep 年間、毎年 full/dep を計上
    if(!co.date) return 0;
    const buyYear = new Date(co.date).getFullYear();
    const annual = full/dep;
    if(period==="month"){
      // 月単位なら年額の1/12（購入年〜償却終了年の範囲内の月のみ）
      if(selYear>=buyYear && selYear<buyYear+dep) return annual/12;
      return 0;
    }
    if(period==="year"){
      if(selYear>=buyYear && selYear<buyYear+dep) return annual;
      return 0;
    }
    return full; // crop期間は全額
  };

  // 全品目のデータ集計
  // デバッグ: costs の内容を確認

  const cropStats = crops.map(c=>{
    const db=CDB[c.type]||{};
    const f=fields[c.fieldIdx]||{};
    const cl=logs.filter(l=>l.cropId===c.id && inPeriod(l.date));
    const kg=cl.reduce((s,l)=>s+(parseFloat(l.hvKg)||0),0);
    const cnt=cl.reduce((s,l)=>s+(parseInt(l.hvCnt)||0),0);
    const rev=cl.reduce((s,l)=>s+(parseFloat(l.hvKg)||0)*(parseFloat(l.hvPrice)||0),0);
    const minutes=cl.reduce((s,l)=>s+(parseInt(l.duration)||0),0);
    const added=cl.filter(l=>l.addCnt).reduce((s,l)=>s+(parseInt(l.addCnt)||0),0);
    const disc=cl.filter(l=>l.discardCnt).reduce((s,l)=>s+(parseInt(l.discardCnt)||0),0);
    const stocks=(parseInt(c.stocks)||0)+added-disc;
    const sowLog=cl.find(l=>l.sowQty);
    const germLog=cl.find(l=>l.germinationCnt);
    const germRate=sowLog&&germLog?Math.round((parseInt(germLog.germinationCnt)/parseInt(sowLog.sowQty))*100):null;
    // 種・苗費用（この品目に直接紐づくもの、またはcropIdがない場合は品目名で照合）
    const cropName0 = c.type==="custom"?(c.customName||"カスタム"):(CDB[c.type]?.n||c.type);
    const seedCosts = costs.filter(co=>
      (period==="crop" || inPeriod(co.date)) &&
      co.cat==="seed" && (
        co.cropId===c.id ||
        co.cropId===c.id.toString() ||
        (!co.cropId && (
          co.name.startsWith(cropName0) ||
          co.name.includes(cropName0) ||
          (c.variety && co.name.includes(c.variety))
        ))
      )
    );
    const seedTotal = seedCosts.reduce((s,co)=>s+(parseFloat(co.amt)||0),0);
    // 施肥・農薬費用（作業記録のマスター単価×使用量で計算・単位変換あり）
    let fertTotal=0, pestTotal=0;
    cl.forEach(l=>{
      if(l.fertName && l.fertAmt && parseFloat(l.fertAmt)>0) {
        const fm=fertMs.find(f=>f.name===l.fertName);
        if(fm?.price && fm?.capacity && parseFloat(fm.capacity)>0) {
          // 使用量をマスターの内容量単位に変換
          const normalizedAmt = normalizeToMasterUnit(l.fertAmt, l.fertUnit, fm.cunit||fm.sunit);
          const unitCost = parseFloat(fm.price) / parseFloat(fm.capacity);
          fertTotal += Math.round(unitCost * normalizedAmt);
        }
      }
      if(l.pestName && l.pestAmt && parseFloat(l.pestAmt)>0) {
        const pm=pestMs.find(p=>p.name===l.pestName);
        if(pm?.price && pm?.capacity && parseFloat(pm.capacity)>0) {
          // 使用量をマスターの内容量単位に変換
          const normalizedAmt = normalizeToMasterUnit(l.pestAmt, l.pestUnit, pm.cunit||pm.sunit);
          const unitCost = parseFloat(pm.price) / parseFloat(pm.capacity);
          pestTotal += Math.round(unitCost * normalizedAmt);
        }
      }
    });
    // この品目にcropIdで明示的に割り当てられた費用（手動割当含む・seed自動分は二重計上回避のため除外）
    const assignedCosts = costs.filter(co=>
      (period==="crop" || inPeriod(co.date)) &&
      co.cropId===c.id && co.cat!=="seed" && !co.logId  // logId付き(施肥/防除自動)とseedは別集計済み
    );
    const assignedTotal = assignedCosts.reduce((s,co)=>s+(parseFloat(co.amt)||0),0);
    const costTotal = seedTotal + fertTotal + pestTotal + assignedTotal;
    const h=Math.floor(minutes/60), m=minutes%60;
    const timeStr=minutes>0?(h>0?h+"時間"+m+"分":m+"分"):"—";
    const name=(c.type==="custom"?c.customName||"カスタム":db.n||c.type)+(c.variety?" ("+c.variety+")":"");
    // 施肥・農薬の使用量集計
    const fertUse={}; // {name: {amt, unit}}
    const pestUse={}; // {name: {amt, unit}}
    cl.filter(l=>l.fertName&&l.fertAmt).forEach(l=>{
      if(!fertUse[l.fertName]) fertUse[l.fertName]={amt:0,unit:l.fertUnit||""};
      fertUse[l.fertName].amt+=parseFloat(l.fertAmt)||0;
    });
    cl.filter(l=>l.pestName&&l.pestAmt).forEach(l=>{
      if(!pestUse[l.pestName]) pestUse[l.pestName]={amt:0,unit:l.pestUnit||""};
      pestUse[l.pestName].amt+=parseFloat(l.pestAmt)||0;
    });
    return{id:c.id,name,emoji:db.e||"🌱",field:f.name||"?",ended:c.ended||false,endDate:c.endDate||"",
      kg,cnt,rev,minutes,timeStr,stocks,disc,added,germRate,costTotal,profit:rev-costTotal,
      seedTotal,fertTotal,pestTotal,assignedTotal,
      logCount:cl.length,plantDate:c.plantDate||"",sowDate:c.sowDate||"",
      growDays:(()=>{const st=c.plantDate||c.sowDate;if(!st)return null;const en=c.ended&&c.endDate?new Date(c.endDate):new Date();const d=Math.round((en-new Date(st))/86400000);return d>=0?d:null;})(),
      fertUse,pestUse};
  });

  // 選択中の品目データ
  const sel = selCropId==="all" ? null : cropStats.find(c=>c.id===selCropId);
  const dispLogs = (selCropId==="all" ? logs : logs.filter(l=>l.cropId===selCropId)).filter(l=>inPeriod(l.date)).sort((a,b)=>((a.date+a.time)<(b.date+b.time)?-1:1));

  // 全体集計
  const totalKg  = cropStats.reduce((s,c)=>s+c.kg,0);
  const totalRev = cropStats.reduce((s,c)=>s+c.rev,0);
  const totalCost= costs.reduce((s,c)=>s+costAmount(c),0);
  const commonCost= costs.filter(c=>!c.cropId).reduce((s,c)=>s+costAmount(c),0);
  const totalMin = logs.filter(l=>inPeriod(l.date)).reduce((s,l)=>s+(parseInt(l.duration)||0),0);
  const th=Math.floor(totalMin/60),tm=totalMin%60;
  const totalTimeStr=totalMin>0?(th>0?th+"時間"+tm+"分":tm+"分"):"0分";



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
       
              {sel.assignedTotal>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                <span>📦 その他割当費用</span><span style={{fontWeight:700}}>{Math.round(sel.assignedTotal).toLocaleString()}円</span>
              </div>}       </div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:".86rem",fontWeight:700,color:G}}>
                <span>合計</span><span>{Math.round(sel.costTotal).toLocaleString()}円</span>
              </div>
            </div>
          )}

          {/* 施肥・農薬使用量 */}
          {(Object.keys(sel.fertUse).length>0||Object.keys(sel.pestUse).length>0)&&(
            <div style={S.card}>
              <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:8}}>📊 資材使用量</div>
              {Object.entries(sel.fertUse).map(([name,{amt,unit}])=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                  <span style={{color:"#065f46"}}>🌿 {name}</span>
                  <span style={{fontWeight:700}}>{amt.toFixed(1)}{unit}</span>
                </div>
              ))}
              {Object.entries(sel.pestUse).map(([name,{amt,unit}])=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid "+BD,fontSize:".82rem"}}>
                  <span style={{color:"#92400e"}}>🐛 {name}</span>
                  <span style={{fontWeight:700}}>{amt.toFixed(1)}{unit}</span>
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
            const seenW=new Set();
            const sortedLogs=[...card.logs].sort((a,b)=>{
              const oa=WORK_TYPES.findIndex(w=>w.value===a.work);
              const ob=WORK_TYPES.findIndex(w=>w.value===b.work);
              return (oa<0?99:oa)-(ob<0?99:ob);
            }).filter(l=>{ if(seenW.has(l.work))return false; seenW.add(l.work); return true; });
            return (
              <div key={card.key} style={{...S.card,padding:0,overflow:'hidden',marginBottom:8}}>
                <div style={{padding:'8px 11px'}}>
                  <div style={{fontSize:'.7rem',color:TX3,marginBottom:4,display:'flex',gap:8}}>
                    <span>📅 {fmtYMD(l0.date)}</span>
                    {l0.time&&<span>🕐{l0.time}</span>}
                    {fields[l0.fieldIdx]?.name&&<span>📍{fields[l0.fieldIdx].name}</span>}
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:4}}>
                    {sortedLogs.map((l,i)=>{
                      const w=WORK[l.work]||{label:l.work||'',tag:'gray',icon:'📝'};
                      return <Tag key={i} type={w.tag}>{w.icon} {w.label}</Tag>;
                    })}
                  </div>
                  {card.logs.map((l,li)=>(
                    <div key={li}>
                      {l.fertName&&<div style={{fontSize:'.75rem',color:'#065f46'}}>🌿 {l.fertName}{l.fertAmt?` ${l.fertAmt}${l.fertUnit||''}`:''}{l.fertMethod?` (${l.fertMethod})`:''}</div>}
                      {l.pestName&&<div style={{fontSize:'.75rem',color:'#92400e'}}>🐛 {l.pestName}{l.pestDil?` ${l.pestDil}倍`:''}{l.pestSprayAmt?` 散布${l.pestSprayAmt}${l.pestUnit||''}`:''}{l.pestTarget?` 対象:${l.pestTarget}`:''}</div>}
                      {(l.hvKg||l.hvCnt)&&<div style={{fontSize:'.75rem',color:'#059669'}}>🧺 {l.hvGradeStr||`${l.hvKg||''}${l.hvKg?'kg':''}${l.hvCnt?` ${l.hvCnt}個`:''}`}</div>}
                      {l.sowQty&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>🌰 播種 {l.sowQty}粒</div>}
                      {l.germinationCnt&&<div style={{fontSize:'.75rem',color:'#065f46'}}>🌱 発芽 {l.germinationCnt}粒{l.germinationDate?` (${fmtMD(l.germinationDate)})`:''}</div>}
                      {l.transplantQty&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>🪴 定植 {l.transplantQty}株</div>}
                      {l.eventType&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>📋 {l.eventType}{l.eventNote?` · ${l.eventNote}`:''}</div>}
                      {(l.discardCnt||l.addCnt)&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>📊 株数調整{l.addCnt?` +${l.addCnt}株`:''}{ l.discardCnt?` -${l.discardCnt}株（廃棄）`:''}</div>}
                      {l.equipAct&&<div style={{fontSize:'.75rem',color:'#5b21b6'}}>{l.equipAct}</div>}
                      {l.otherNote&&<div style={{fontSize:'.75rem',color:'#5a5040'}}>✏️ {l.otherNote}</div>}
                    </div>
                  ))}
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

// SETTINGS
function PublicSettings({ uid, crops, showToast }) {
  const [isPublic,   setIsPublic]   = useState(false);
  const [name,       setName]       = useState("");
  const [desc,       setDesc]       = useState("");
  const [publicCrops,setPublicCrops]= useState({});
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);


  useEffect(()=>{
    if(!uid) return;
    Promise.all([
      sb.from("public_farms").select("").eq("user_id",uid).maybeSingle(),
      sb.from("crops").select("id,is_public").eq("user_id",uid)
    ]).then(([{data:farm},{data:cropRows}])=>{
      if(farm){ setIsPublic(farm.is_public||false); setName(farm.display_name||""); setDesc(farm.description||""); }
      if(cropRows){ const m={}; cropRows.forEach(c=>{ m[c.id]=c.is_public||false; }); setPublicCrops(m); }
      setLoading(false);
    });
  },[uid]);

  const toggleCrop = (id) => setPublicCrops(p=>({...p,[id]:!p[id]}));

  const save = async() => {
    if(!uid) return;
    setSaving(true);
    await sb.from("public_farms").upsert({
      user_id:uid, is_public:isPublic, display_name:name, description:desc, updated_at:new Date().toISOString()
    },{onConflict:"user_id"});
    for(const [cropId, pub] of Object.entries(publicCrops)){
      await sb.from("crops").update({is_public:pub}).eq("id",cropId).eq("user_id",uid);
    }
    showToast("公開設定を保存しました");
    setSaving(false);
  };

  if(loading) return null;
  const activeCrops = crops.filter(c=>!c.ended);
  const endedCrops  = crops.filter(c=>c.ended);

  return (
    <div style={S.card}>
      <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".86rem",color:"#5c3d1e",marginBottom:12}}>🌐 栽培記録を公開</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"10px 12px",background:"#f5f5f0",borderRadius:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:".86rem"}}>公開する</div>
          <div style={{fontSize:".72rem",color:TX3}}>みんなのサクメモに掲載されます</div>
        </div>
        <button onClick={()=>setIsPublic(!isPublic)}
          style={{width:44,height:26,borderRadius:999,border:"none",cursor:"pointer",
            background:isPublic?G:"#ccc",position:"relative",transition:"background .2s",flexShrink:0}}>
          <span style={{position:"absolute",top:3,left:isPublic?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
        </button>
      </div>
      {isPublic&&<>
        <FG label="農場名"><Inp value={name} onChange={setName} placeholder="例：〇〇農園"/></FG>
        <FG label="一言説明（任意）"><Inp value={desc} onChange={setDesc} placeholder="例：静岡県で有機野菜を栽培しています"/></FG>

        <div style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:".78rem",fontWeight:700,color:"#5c3d1e"}}>公開する品目を選ぶ</span>
            <button onClick={save} disabled={saving} style={{background:saving?"#ccc":G,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:".74rem",fontWeight:700,cursor:"pointer"}}>{saving?"保存中…":"保存 ✓"}</button>
          </div>
          {activeCrops.length===0&&<div style={{fontSize:".76rem",color:TX3}}>栽培中の品目がありません</div>}
          {activeCrops.map(c=>{ const db=CDB[c.type]||{}; const n=c.type==="custom"?c.customName||"カスタム":db.n||c.type; return (
            <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:publicCrops[c.id]?"#f0f9f0":"#fafafa",borderRadius:9,marginBottom:5,border:"1px solid "+(publicCrops[c.id]?"#6ee7b7":BD)}}>
              <span style={{fontSize:".84rem"}}>{db.e||"🌱"} {n}{c.variety?" ("+c.variety+")":""}</span>
              <button onClick={()=>toggleCrop(c.id)}
                style={{width:40,height:22,borderRadius:999,border:"none",cursor:"pointer",
                  background:publicCrops[c.id]?G:"#ccc",position:"relative",transition:"background .2s",flexShrink:0}}>
                <span style={{position:"absolute",top:2,left:publicCrops[c.id]?19:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>
          );})}
          {endedCrops.map(c=>{ const db=CDB[c.type]||{}; const n=c.type==="custom"?c.customName||"カスタム":db.n||c.type; return (
            <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:publicCrops[c.id]?"#f0f9f0":"#fafafa",borderRadius:9,marginBottom:5,border:"1px solid "+(publicCrops[c.id]?"#6ee7b7":BD),opacity:.75}}>
              <span style={{fontSize:".84rem"}}>{db.e||"🌱"} {n}{c.variety?" ("+c.variety+")":""} <span style={{fontSize:".65rem",color:"#e67e22"}}>終了</span></span>
              <button onClick={()=>toggleCrop(c.id)}
                style={{width:40,height:22,borderRadius:999,border:"none",cursor:"pointer",
                  background:publicCrops[c.id]?G:"#ccc",position:"relative",transition:"background .2s",flexShrink:0}}>
                <span style={{position:"absolute",top:2,left:publicCrops[c.id]?19:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>
          );})}
        </div>

      </>}
      
      {isPublic&&(
        <a href={"/farm.html?uid="+uid} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#f0f9f0",border:"1.5px solid #6ee7b7",borderRadius:10,padding:"10px",marginTop:8,textDecoration:"none",color:G,fontWeight:700,fontSize:".82rem"}}>
          🌾 自分のサクメモページを見る →
        </a>
      )}
    </div>
  );
}

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

function SettingsScreen({ showToast, user, uid, signOut, fields, crops, logs, fertMs, pestMs, equips, costs, setScr }) {
  const doExport=()=>{ const d=JSON.stringify({fields,crops,logs,fertMs,pestMs,equips,costs},null,2);const a=document.createElement("a");a.href="data:application/json;charset=utf-8,"+encodeURIComponent(d);a.download="farm-ai-export-"+todayStr()+".json";a.click(); };
  return (
    <div style={S.scr} className="scr-inner">
      <div style={S.sec}>
        <span>⚙️ 設定</span>
        <button onClick={()=>setScr("home")}
          style={{background:G,border:"none",borderRadius:999,padding:"6px 16px",fontSize:".76rem",fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
          ✕ 閉じる
        </button>
      </div>

      {/* アカウント */}
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

      {/* 栽培記録の公開設定 */}
      <PublicSettings uid={uid} crops={crops} showToast={showToast}/>

      {/* ログアウト（公開設定の下） */}
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
  { key:"master",  label:"資材・設備", icon:"📦" },
  { key:"cost",    label:"費用",       icon:"💰" },
  { key:"report",  label:"レポート",   icon:"📊" },
];

export default function App() {
  const [user,     setUser]    = useState(null);
  const [authLoad, setAuthLoad]= useState(true);
  const [inviteMode, setInviteMode] = useState(false);

  // ブラウザタイトル設定
  useEffect(()=>{ document.title = "サクメモ - 作物の記録アプリ"; },[]);



  // Twemoji: 絵文字をTwitter統一デザインに（render後に適用）
  
  const [dbLoad,   setDbLoad]  = useState(false);
  const [scr,      setScr]     = useState("home");
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
  const [initWork,     setInitWork]    = useState("");
  const [initLog,      setInitLog]     = useState(null);
  const [initLogs,     setInitLogs]    = useState([]);   // 複数作業編集用
  const [logModal,     setLogModal]    = useState(false);
  const logScreenSaveRef = useRef(null); // LogScreenのdoSave参照
  const [pendingEditCrop, setPendingEditCrop] = useState(null); // ホームから品目編集
  const toastTimer = useRef(null);
  const showToast = msg => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(""),2400); };

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
        sb.auth.getSession().then(({data:{session}})=>setUser(session?.user??null));
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
      setEquipsR(eq.map(equipFromDb));setCostsR(co.map(r=>costFromDb(r,rawF)));setPlotsR((pl||[]).map(plotFromDb));
      setDbLoad(false);
    }).catch(e=>console.error("LOAD ERROR:", e));
  },[user]);

  const uid=user?.id;

  // ── DB保存ヘルパー（1件だけ保存・非同期） ──
  const dbSaveField = o => { if(!uid) return; const item = {...o, id:o.id||uid0()}; dbUpsert("fields", fieldToDb(item, uid)); return item; };
  const dbSaveCrop  = (o, flds) => { if(!uid) return; const fId = (flds||fields)[o.fieldIdx]?.id || o.fieldId || null; dbUpsert("crops", cropToDb({...o, fieldId:fId}, uid)); };
  const dbSaveLog   = o => { if(!uid){console.error('dbSaveLog: no uid');return;} console.log('[dbSaveLog] work:',o.work,'img:',o.imgSrc?'yes':'no'); dbUpsert("logs", logToDb(o, uid, fields)); };
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

  const TITLES={home:"作物の記録アプリ",master:"マスター登録",fields:"圃場・品目管理",plot:"栽培計画",log:"作業記録",cost:"費用管理",report:"分析レポート",settings:"設定"};

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
          <button style={S.tbBtn} onClick={()=>setScr("settings")}>⚙️</button>
          <button style={S.tbBtn} onClick={signOut}>ログアウト</button>
        </div>
      </div>
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
        {scr==="master"  &&<MasterScreen  fertMs={fertMs} setFertMs={setFertMs} pestMs={pestMs} setPestMs={setPestMs} equips={equips} setEquips={setEquips} costs={costs} setCosts={setCosts} showToast={showToast}/>}
        {scr==="fields"  &&<FieldsScreen  fields={fields} setFields={setFields} setFieldsR={setFieldsR} crops={crops} setCrops={setCrops} setCropsR={setCropsR} costs={costs} setCosts={setCosts} logs={logs} showToast={showToast} editCrop={pendingEditCrop}/>}
        {(scr==="log"||scr==="home") && <><HomeScreen fields={fields} crops={crops} logs={logs} costs={costs} onEditCrop={c=>{setPendingEditCrop(c);setScr("fields");}} onNew={()=>{setInitLog(null);setLogModal(true);}}/><TimelineScreen fields={fields} crops={crops} equips={equips} logs={logs} setLogs={setLogs} setLogsR={setLogsR} showToast={showToast}
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
      /> }</>}
        
        {scr==="plot"    &&<PlanScreen    fields={fields} crops={crops} plots={plots} setPlots={setPlots} setPlotsR={setPlotsR} showToast={showToast}/>}
        {scr==="cost"    &&<CostScreen    fields={fields} crops={crops} fertMs={fertMs} pestMs={pestMs} equips={equips} costs={costs} setCosts={setCosts} logs={logs} showToast={showToast}/>}

        {scr==="report"  &&<ReportScreen  fields={fields} crops={crops} logs={logs} costs={costs} fertMs={fertMs} pestMs={pestMs} equips={equips}/>}
        {scr==="settings"&&<SettingsScreen showToast={showToast} user={user} uid={uid} signOut={signOut} fields={fields} crops={crops} logs={logs} fertMs={fertMs} pestMs={pestMs} equips={equips} costs={costs} setScr={setScr}/>}
      </div>
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
            <LogScreen key={(initLog?._isCopy?"copy-"+(initLog?.cropId||""):initLog?.id||"new")+String(logModal)} saveRef={logScreenSaveRef} uid={uid} fields={fields} crops={crops} setCrops={setCrops} fertMs={fertMs} pestMs={pestMs} equips={equips} costs={costs} setCosts={setCosts} logs={logs} setLogs={setLogs} dbSaveLog={dbSaveLog} setLogsR={setLogsR} showToast={showToast} initialWork={initWork} editLog={initLog} editLogs={initLogs} onDone={()=>{setLogModal(false);}}/>
          </div>
        </div>}
      {dbLoad && (
        <div style={{position:"fixed",top:0,left:0,right:0,height:3,zIndex:9998,background:"linear-gradient(90deg,"+G+","+G2+")",animation:"loading 1.5s ease-in-out infinite"}}/>
      )}
      <Toast msg={toast}/>
      {/* 全画面共通: トップに戻るボタン */}
      <button
        onClick={()=>{const el=document.getElementById('main-scroll');if(el)el.scrollTo({top:0,behavior:'smooth'});}}
        style={{position:'fixed',bottom:66,right:14,width:38,height:38,borderRadius:'50%',
          background:G,color:'#fff',border:'none',fontSize:'1rem',cursor:'pointer',
          boxShadow:'0 2px 8px rgba(0,0,0,.3)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',
          opacity:.85}}>↑</button>
    </div>
  );
}
