import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://nlamtphkwdoxtjktkjzo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYW10cGhrd2RveHRqa3RranpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODI3NzYsImV4cCI6MjA5MzM1ODc3Nn0.8gba30xxu0s132vg_xOA6-Y3XWjR1YhaprIgUYHZO0o"
);

// DB helpers
const dbFetch = async (table, uid) => {
  const { data, error } = await sb.from(table).select("*").eq("user_id", uid).order("created_at");
  if (error) { console.error(table, error.message); return []; }
  return data || [];
};
const dbUpsert = async (table, row) => {
  const { error } = await sb.from(table).upsert(row, { onConflict: "id" });
  if (error) console.error("upsert", table, error.message);
};
const dbDelete = async (table, id) => {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error("delete", table, error.message);
};

// Converters
const fieldToDb   = (o, uid) => ({ id:o.id, user_id:uid, name:o.name||"", area:o.area||null, soil:o.soil||null, addr:o.addr||null, memo:o.memo||null });
const fieldFromDb = r => ({ id:r.id, name:r.name||"", area:r.area||"", soil:r.soil||"", addr:r.addr||"", memo:r.memo||"" });
const cropToDb    = (o, uid) => ({ id:o.id, user_id:uid, field_id:o.fieldId||null, type:o.type||null, variety:o.variety||null, germ_rate:o.germRate||null, stocks:o.stocks||null, ridge_w:o.ridgeW||null, ridge_h:o.ridgeH||null, rows:o.rows||null, row_space:o.rowSpace||null, plant_space:o.plantSpace||null, sow_date:o.sowDate||null, plant_date:o.plantDate||null, memo:o.memo||null, cultivation_type:o.cultivationType||null, seed_cost:o.seedCost||null, seed_note:o.seedNote||null, custom_name:o.customName||null, ended:o.ended||false, end_date:o.endDate||null, maturity:o.maturity||null, custom_days:o.customDays||null, custom_water:o.customWater||null, pot_size:o.potSize||null, pot_volume:o.potVolume||null, pot_count:o.potCount||null, grow_env:o.growEnv||null });
const cropFromDb  = (r, fields) => { const fi = fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, type:r.type||"", variety:r.variety||"", germRate:r.germ_rate||"", stocks:r.stocks||"", ridgeW:r.ridge_w||"", ridgeH:r.ridge_h||"", rows:r.rows||"", rowSpace:r.row_space||"", plantSpace:r.plant_space||"", sowDate:r.sow_date||"", plantDate:r.plant_date||"", memo:r.memo||"", cultivationType:r.cultivation_type||"transplant", seedCost:r.seed_cost||"", seedNote:r.seed_note||"", customName:r.custom_name||"", ended:r.ended||false, endDate:r.end_date||"", maturity:r.maturity||"mid", customDays:r.custom_days||"", customWater:r.custom_water||"", potSize:r.pot_size||"", potVolume:r.pot_volume||"", potCount:r.pot_count||"", growEnv:r.grow_env||"field" }; };
const logToDb     = (o, uid, fields) => ({ id:o.id, user_id:uid, field_id:fields[o.fieldIdx]?.id||o.fieldId||null, crop_id:o.cropId||null, work:o.work||null, memo:o.memo||null, date:o.date||null, time:o.time||null, duration:o.duration||null, img_src:o.imgSrc||null, ai_reply:o.aiReply||null, fert_name:o.fertName||null, fert_amt:o.fertAmt||null, fert_unit:o.fertUnit||null, fert_method:o.fertMethod||null, fert_cost:o.fertCost||null, pest_name:o.pestName||null, pest_dil:o.pestDil||null, pest_amt:o.pestAmt||null, pest_unit:o.pestUnit||null, pest_target:o.pestTarget||null, pest_cost:o.pestCost||null, hv_kg:o.hvKg||null, hv_cnt:o.hvCnt||null, hv_q:o.hvQ||null, hv_price:o.hvPrice||null, hv_img_src:o.hvImgSrc||null, equip_ids:o.equipIds||null, equip_act:o.equipAct||null, sow_qty:o.sowQty||null, germination_cnt:o.germinationCnt||null, germination_date:o.germinationDate||null, transplant_qty:o.transplantQty||null, discard_cnt:o.discardCnt||null, add_cnt:o.addCnt||null, event_type:o.eventType||null, event_note:o.eventNote||null });
const logFromDb   = (r, fields) => { const fi=fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldId:r.field_id||"", fieldIdx:fi>=0?fi:0, cropId:r.crop_id||"", work:r.work||"", memo:r.memo||"", date:r.date||"", time:r.time||"", duration:r.duration||"", imgSrc:r.img_src||null, aiReply:r.ai_reply||"", fertName:r.fert_name||"", fertAmt:r.fert_amt||"", fertUnit:r.fert_unit||"", fertMethod:r.fert_method||"", fertCost:r.fert_cost||"", pestName:r.pest_name||"", pestDil:r.pest_dil||"", pestAmt:r.pest_amt||"", pestUnit:r.pest_unit||"", pestTarget:r.pest_target||"", pestCost:r.pest_cost||"", hvKg:r.hv_kg||"", hvCnt:r.hv_cnt||"", hvQ:r.hv_q||"", hvPrice:r.hv_price||"", hvImgSrc:r.hv_img_src||null, equipIds:r.equip_ids||[], equipAct:r.equip_act||"", sowQty:r.sow_qty||"", germinationCnt:r.germination_cnt||"", germinationDate:r.germination_date||"", transplantQty:r.transplant_qty||"", discardCnt:r.discard_cnt||"", addCnt:r.add_cnt||"", eventType:r.event_type||"", eventNote:r.event_note||"" }; };
const fertMToDb   = (o, uid) => ({ id:o.id, user_id:uid, name:o.name||null, type:o.type||null, npk:o.npk||null, price:o.price||null, punit:o.punit||null, capacity:o.capacity||null, cunit:o.cunit||null, stock:o.stock||null, sunit:o.sunit||null, note:o.note||null });
const fertMFromDb = r => ({ id:r.id, name:r.name||"", type:r.type||"", npk:r.npk||"", price:r.price||"", punit:r.punit||"", capacity:r.capacity||"", cunit:r.cunit||"", stock:r.stock||"0", sunit:r.sunit||"", note:r.note||"" });
const pestMToDb   = (o, uid) => ({ id:o.id, user_id:uid, name:o.name||null, type:o.type||null, dil:o.dil||null, target:o.target||null, price:o.price||null, punit:o.punit||null, capacity:o.capacity||null, cunit:o.cunit||null, stock:o.stock||null, sunit:o.sunit||null, note:o.note||null });
const pestMFromDb = r => ({ id:r.id, name:r.name||"", type:r.type||"", dil:r.dil||"", target:r.target||"", price:r.price||"", punit:r.punit||"", capacity:r.capacity||"", cunit:r.cunit||"", stock:r.stock||"0", sunit:r.sunit||"", note:r.note||"" });
const equipToDb   = (o, uid) => ({ id:o.id, user_id:uid, name:o.name||null, cat:o.cat||null, status:o.status||null, price:o.price||null, date:o.date||null, note:o.note||null });
const equipFromDb = r => ({ id:r.id, name:r.name||"", cat:r.cat||"", status:r.status||"", price:r.price||"", date:r.date||"", note:r.note||"" });
const costToDb    = (o, uid, fields) => ({ id:o.id, user_id:uid, field_id:fields[o.fieldIdx]?.id||null, crop_id:o.cropId||null, cat:o.cat||null, name:o.name||null, amt:o.amt||null, date:o.date||null, qty:o.qty||null, qunit:o.qunit||null, note:o.note||null, master_id:o.masterId||null });
const costFromDb  = (r, fields) => { const fi=fields.findIndex(f=>f.id===r.field_id); return { id:r.id, fieldIdx:fi>=0?fi:"", cropId:r.crop_id||"", masterId:r.master_id||"", cat:r.cat||"", name:r.name||"", amt:r.amt||"", date:r.date||"", qty:r.qty||"", qunit:r.qunit||"", note:r.note||"" }; };

// ============================================================
// CONSTANTS
// ============================================================
const CDB = {
  // ─── イネ科 ───
  rice:         { n:"水稲",       e:"🌾", d:150, w:2, cat:"イネ科",   hs:"穂が黄金色になり、籾が硬くなったら",          events:["穂ばらみ","出穂","収穫"], maturity:{early:130,mid:150,late:170} },
  wheat:        { n:"麦",         e:"🌾", d:240, w:5, cat:"イネ科",   hs:"穂が黄色くなり茎が枯れてきたら",              events:["出穂","収穫"], maturity:{early:210,mid:240,late:270} },
  corn:         { n:"トウモロコシ",e:"🌽", d:80,  w:2, cat:"イネ科",   hs:"絹糸が茶色になり、押すと乳液が出る状態",      events:["雄穂開花","絹糸出現","収穫"], maturity:{early:70,mid:80,late:95} },
  soba:         { n:"そば",       e:"🌿", d:75,  w:3, cat:"タデ科",   hs:"実の7〜8割が黒褐色になったら",                events:["開花","収穫"], maturity:{early:65,mid:75,late:85} },
  // ─── ナス科 ───
  tomato:       { n:"トマト",     e:"🍅", d:90,  w:2, cat:"ナス科",   hs:"果皮が均一に赤くなりヘタが反り返ったら",      events:["開花","着果","収穫"], maturity:{early:75,mid:90,late:110} },
  cherry_tomato:{ n:"ミニトマト", e:"🍅", d:75,  w:2, cat:"ナス科",   hs:"鮮やかな赤になりわずかに柔らかくなったら",    events:["開花","着果","収穫"], maturity:{early:60,mid:75,late:90} },
  eggplant:     { n:"ナス",       e:"🍆", d:75,  w:1, cat:"ナス科",   hs:"果皮に光沢・ガクのとげが鋭い状態",            events:["開花","収穫"], maturity:{early:65,mid:75,late:90} },
  pepper:       { n:"ピーマン",   e:"🫑", d:70,  w:2, cat:"ナス科",   hs:"長さ6〜7cm・果肉が厚くなったら",              events:["開花","収穫"], maturity:{early:60,mid:70,late:85} },
  potato:       { n:"ジャガイモ", e:"🥔", d:90,  w:3, cat:"ナス科",   hs:"地上部の葉が黄化・枯死したら掘る",            events:["萌芽","開花","地上部枯死"], maturity:{early:75,mid:90,late:110} },
  // ─── ウリ科 ───
  cucumber:     { n:"キュウリ",   e:"🥒", d:55,  w:1, cat:"ウリ科",   hs:"長さ18〜22cm・イボが鮮明で張りがあるうちに",  events:["開花","収穫"], maturity:{early:45,mid:55,late:65} },
  zucchini:     { n:"ズッキーニ", e:"🥒", d:55,  w:1, cat:"ウリ科",   hs:"長さ20cm前後・果皮にツヤがあるうちに",        events:["開花","収穫"], maturity:{early:45,mid:55,late:65} },
  pumpkin:      { n:"カボチャ",   e:"🎃", d:100, w:3, cat:"ウリ科",   hs:"ヘタがコルク化し葉が枯れ始めたら",            events:["開花","受粉","着果","収穫"], maturity:{early:85,mid:100,late:120} },
  watermelon:   { n:"スイカ",     e:"🍉", d:85,  w:3, cat:"ウリ科",   hs:"ヘタの巻きひげが枯れ叩くと濁音がする状態",    events:["開花","受粉","着果","収穫"], maturity:{early:75,mid:85,late:100} },
  melon:        { n:"メロン",     e:"🍈", d:90,  w:3, cat:"ウリ科",   hs:"ヘタの周りが黄色くなり香りが出たら",          events:["開花","受粉","着果","収穫"], maturity:{early:75,mid:90,late:110} },
  bitter_gourd: { n:"ゴーヤ",     e:"🌿", d:60,  w:1, cat:"ウリ科",   hs:"長さ20cm前後・黄緑色均一の状態",              events:["開花","着果","収穫"], maturity:{early:50,mid:60,late:75} },
  // ─── アブラナ科 ───
  cabbage:      { n:"キャベツ",   e:"🥬", d:90,  w:2, cat:"アブラナ科",hs:"結球が固く締まり外葉に張りがある状態",        events:["結球開始","収穫"], maturity:{early:70,mid:90,late:120} },
  hakusai:      { n:"白菜",       e:"🥬", d:90,  w:2, cat:"アブラナ科",hs:"頭部を押して固く締まっていたら",              events:["結球開始","収穫"], maturity:{early:70,mid:90,late:110} },
  broccoli:     { n:"ブロッコリー",e:"🥦", d:90,  w:2, cat:"アブラナ科",hs:"花蕾が緊密で15〜18cm・黄色くなる前に",       events:["頂花蕾形成","収穫"], maturity:{early:75,mid:90,late:110} },
  radish:       { n:"ダイコン",   e:"🌰", d:60,  w:2, cat:"アブラナ科",hs:"根が地表に出て肩の直径6〜8cm",               events:["間引き完了","収穫"], maturity:{early:50,mid:60,late:75} },
  komatsuna:    { n:"小松菜",     e:"🥬", d:35,  w:1, cat:"アブラナ科",hs:"草丈20〜25cmで収穫",                         events:["収穫"], maturity:{early:30,mid:35,late:45} },
  // ─── マメ科 ───
  edamame:      { n:"枝豆",       e:"🫘", d:70,  w:2, cat:"マメ科",   hs:"さやが膨らんで豆の形がはっきりわかる状態",    events:["開花","さや形成","収穫"], maturity:{early:60,mid:70,late:85} },
  green_bean:   { n:"インゲン",   e:"🫘", d:55,  w:2, cat:"マメ科",   hs:"さやが膨らむ前・すじが出る前に収穫",          events:["開花","さや形成","収穫"], maturity:{early:45,mid:55,late:65} },
  azuki:        { n:"小豆",       e:"🫘", d:100, w:3, cat:"マメ科",   hs:"さやが黄褐色になり乾燥してきたら",            events:["開花","さや形成","収穫"], maturity:{early:90,mid:100,late:115} },
  // ─── キク科 ───
  lettuce:      { n:"レタス",     e:"🥬", d:55,  w:1, cat:"キク科",   hs:"結球部を押して固くなったら",                  events:["結球開始","収穫"], maturity:{early:45,mid:55,late:70} },
  // ─── セリ科 ───
  carrot:       { n:"ニンジン",   e:"🥕", d:100, w:2, cat:"セリ科",   hs:"根頭部の直径2.5〜3cm・根長12〜15cm",          events:["間引き完了","収穫"], maturity:{early:85,mid:100,late:120} },
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
  strawberry:   { n:"イチゴ",     e:"🍓", d:180, w:1, cat:"バラ科",   hs:"果実全体が赤く着色しヘタが反り返ったら",      events:["開花","着果","収穫"], maturity:{early:160,mid:180,late:210} },
  // ─── アカザ科 ───
  spinach:      { n:"ほうれん草", e:"🌿", d:40,  w:1, cat:"アカザ科",  hs:"草丈20〜25cm・本葉がしっかり展開したら",      events:["本葉展開","収穫"], maturity:{early:35,mid:40,late:50} },
  // ─── タデ科 ───
  // ─── オクラ（アオイ科）───
  okra:         { n:"オクラ",     e:"🌿", d:60,  w:1, cat:"アオイ科",  hs:"長さ7〜8cm・開花後4〜5日で収穫",              events:["開花","収穫"], maturity:{early:55,mid:60,late:70} },
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
  { value:"equip",      label:"資材作業",     tag:"gray",   icon:"🏗️" },
  { value:"repot",      label:"植え替え",     tag:"purple", icon:"🪴" },
  { value:"check",      label:"見回り",       tag:"gray",   icon:"👀" },
  { value:"other",      label:"その他",       tag:"gray",   icon:"✏️" },
];
const COST_CATS = [
  { value:"seed",  label:"🌱 種・苗" },
  { value:"fert",  label:"🌿 肥料" },
  { value:"pest",  label:"🐛 農薬" },
  { value:"equip", label:"🏗️ 設備・資材" },
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
      console.error("upload error:", error.message, error);
      return null;
    }
    const { data } = sb.storage.from("farm-photos").getPublicUrl(path);
    return data?.publicUrl || null;
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
  body{font-family:'BIZ UDGothic',sans-serif;background:#f8f5ef;color:#1c1a14;}
  button,input,select,textarea{font-family:inherit;}
  @media(min-width:900px){
    #bot-nav{display:none!important;}
    #pc-nav{display:flex!important;}
    #main-scroll{height:calc(100svh - 52px - 44px);overflow-y:auto;scrollbar-width:none;}
    #main-scroll::-webkit-scrollbar{display:none;}
    .scr-inner{padding-bottom:20px!important;}
  }
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
function Btn({ onClick, style, disabled, children }) { return <button onClick={onClick} disabled={disabled} style={{...S.btn,...style,opacity:disabled?.5:1,cursor:disabled?"not-allowed":"pointer"}}>{children}</button>; }
function FG({ label, children }) { return <div style={S.fg}>{label&&<label style={S.lbl}>{label}</label>}{children}</div>; }
function Inp({ value, onChange, type="text", placeholder="", style={}, ...props }) { return <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...S.inp,...style}} {...props} />; }
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
    <div style={{position:"fixed",top:52,left:0,right:0,bottom:0,zIndex:9999,display:"flex",flexDirection:"column",background:"#f8f5ef"}}>
      <div style={{background:GD,color:"#fff",padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:8}}>
        <span style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:".92rem",fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:".8rem",cursor:"pointer",flexShrink:0}}>✕</button>
        <button onClick={onSave} style={{background:"#fff",border:"none",color:G,borderRadius:8,padding:"6px 14px",fontSize:".8rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>{saveLabel} ✓</button>
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
                  placeholder="パスワードを設定"
                  style={{width:"100%",padding:"9px 36px 9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:".86rem",fontFamily:"inherit",outline:"none"}}/>
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
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:".86rem",fontFamily:"inherit",outline:"none"}}/>
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
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);

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
    setErr(error?error.message:"パスワードリセットメールを送信しました");
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100svh",background:"linear-gradient(135deg,"+GD+","+G+")",padding:20}}>
      <style>{globalCss}</style>
      <div style={{background:"#fff",borderRadius:20,padding:"28px 24px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:6}}>🌾</div>
        <div style={{fontFamily:"'Shippori Mincho B1',serif",fontSize:"1.3rem",color:G,marginBottom:4}}>サクメモ</div>
        <div style={{fontSize:".76rem",color:TX3,marginBottom:24}}>作物の記録アプリ</div>
        <div style={{textAlign:"left"}}>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>メールアドレス</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@gmail.com" autoComplete="email"
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:".86rem",fontFamily:"inherit",outline:"none"}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"#5c3d1e",marginBottom:3}}>パスワード</div>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="パスワード" autoComplete="current-password"
                style={{width:"100%",padding:"9px 36px 9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,fontSize:".86rem",fontFamily:"inherit",outline:"none"}}/>
              <button type="button" onClick={()=>setShowPw(p=>!p)}
                style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:".8rem",color:"#888"}}>
                {showPw?"🙈":"👁"}
              </button>
            </div>
          </div>
        </div>
        <button onClick={loginEmail} disabled={loading}
          style={{width:"100%",padding:"11px",background:loading?"#ccc":G,color:"#fff",border:"none",borderRadius:12,fontSize:".86rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
          {loading?"ログイン中…":"ログイン"}
        </button>
        {err&&<div style={{color:"#e74c3c",fontSize:".78rem",marginTop:4,marginBottom:8}}>{err}</div>}
        <button onClick={resetPw}
          style={{background:"none",border:"none",color:TX3,fontSize:".74rem",cursor:"pointer",fontFamily:"inherit",display:"block",margin:"0 auto"}}>
          パスワードを忘れた方
        </button>
        <div style={{fontSize:".66rem",color:"#a09070",marginTop:16,lineHeight:1.6}}>
          <a href="https://sakumemo-1.vercel.app/privacy-policy.html" target="_blank" style={{color:G}}>プライバシーポリシー</a>・
          <a href="https://sakumemo-1.vercel.app/terms-of-service.html" target="_blank" style={{color:G}}>利用規約</a>
        </div>
      </div>
    </div>
  );
}

