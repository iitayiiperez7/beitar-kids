// Beitar Jerusalem first-team squad, season 2026/27.
//
// Verified 2026-10-21 against:
//  - the club squad page  https://www.beitarfc.co.il/השחקנים/?roles=סגל-הקבוצה  (24 players)
//  - the IFA team page    https://www.football.org.il/team-details/?season_id=28&team_id=3595
//  - IFA match sheets 17/08–19/10/2026 for shirt numbers (the IFA squad list has no numbers)
// Positions follow the club's own groups (שוערים / הגנה / קישור / התקפה).
//
// Photos: only openly licensed Wikimedia Commons photos ship with the app (each
// checked by eye: the right player, in a Beitar kit; credited in the app). The
// club's own photos are not included — its terms of use forbid reuse without
// written permission. Parents add more photos on their device (parent screen);
// without one, the game shows a jersey with the player's number.

import type { Player, Position } from './types'

const VERIFIED_AT = '2026-10-21'
const CLUB = 'https://www.beitarfc.co.il/player/'
const BOTH_SOURCES = 'אתר המועדון + טפסי משחק של ההתאחדות'

/** An openly licensed photo (shown with credit). */
interface LicensedPhoto {
  url: string
  page: string
  author: string
  license: string
  date?: string
  /** CSS object-position keeping the face in frame. */
  focus?: string
  zoom?: number
}

interface Seed {
  id: string
  first: string
  last: string
  number: number | null
  position: Position
  priority: number
  /** Slug of the player's page on beitarfc.co.il, if there is one. */
  page?: string
  say?: { first?: string; last?: string }
  aliases?: string[]
  firstAliases?: string[]
  lastAliases?: string[]
  verified?: boolean
  note?: string
  active?: boolean
  photos?: LicensedPhoto[]
}

function make(s: Seed): Player {
  const verified = s.verified ?? true
  return {
    id: s.id,
    firstName: s.first,
    lastName: s.last,
    fullName: `${s.first} ${s.last}`,
    aliases: s.aliases ?? [],
    firstNameAliases: s.firstAliases ?? [],
    lastNameAliases: s.lastAliases ?? [],
    jerseyNumber: s.number,
    position: s.position,
    images: [],
    imageSources: (s.photos ?? []).map((ph) => ({
      url: ph.url,
      source: `Wikimedia Commons · ${ph.author}`,
      date: ph.date,
      license: ph.license,
      pageUrl: ph.page,
      verified: true,
      addedAt: VERIFIED_AT,
      objectPosition: ph.focus,
      zoom: ph.zoom,
    })),
    imageVerified: false,
    active: s.active ?? true,
    learningPriority: s.priority,
    audioPronunciation: { firstName: s.say?.first, lastName: s.say?.last },
    dataVerified: verified,
    lastVerifiedAt: verified ? VERIFIED_AT : null,
    verificationNote: s.note ?? (verified ? BOTH_SOURCES : undefined),
    officialUrl: s.page ? CLUB + s.page + '/' : undefined,
  }
}

export const SQUAD_SEASON = '2026/27'

// Openly licensed photos from Wikimedia Commons, checked 2026-10-21.
const PHOTOS: Record<string, LicensedPhoto[]> = {
  'yarden-shua': [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/%D7%99%D7%A8%D7%93%D7%9F_%D7%A9%D7%95%D7%A2%D7%94_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%AA%22%D7%90.jpg/960px-%D7%99%D7%A8%D7%93%D7%9F_%D7%A9%D7%95%D7%A2%D7%94_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%AA%22%D7%90.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D7%99%D7%A8%D7%93%D7%9F_%D7%A9%D7%95%D7%A2%D7%94_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%AA%22%D7%90.jpg', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY 4.0', date: '2026-01-01', focus: '52% 28%' },
  ],
  'miguel-silva': [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/%D7%9E%D7%99%D7%92%D7%9C_%D7%A1%D7%99%D7%9C%D7%91%D7%99_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%22%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%9E%D7%9B%D7%91%D7%99_%D7%AA%22%D7%90.jpg/960px-%D7%9E%D7%99%D7%92%D7%9C_%D7%A1%D7%99%D7%9C%D7%91%D7%99_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%22%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%9E%D7%9B%D7%91%D7%99_%D7%AA%22%D7%90.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D7%9E%D7%99%D7%92%D7%9C_%D7%A1%D7%99%D7%9C%D7%91%D7%99_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%22%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%9E%D7%9B%D7%91%D7%99_%D7%AA%22%D7%90.jpg', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY-SA 4.0', date: '2026-02-16', focus: '53% 25%', zoom: 1.5 },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Miguel_Macedo_Silva.jpg/960px-Miguel_Macedo_Silva.jpg', page: 'https://commons.wikimedia.org/wiki/File:Miguel_Macedo_Silva.jpg', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY 4.0', date: '2024-11-18', focus: '38% 15%', zoom: 1.8 },
  ],
  'omer-atzili': [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Beitar_Jerusalem_FC_vs._MTK_Budapest_FC_2016-06-18_%28018%29.jpg/960px-Beitar_Jerusalem_FC_vs._MTK_Budapest_FC_2016-06-18_%28018%29.jpg', page: 'https://commons.wikimedia.org/wiki/File:Beitar_Jerusalem_FC_vs._MTK_Budapest_FC_2016-06-18_(018).jpg', author: 'Steindy', license: 'CC BY-SA 3.0', date: '2016-06-18', focus: '50% 28%' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/%D7%A2%D7%95%D7%9E%D7%A8_%D7%90%D7%A6%D7%99%D7%9C%D7%99_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%91%22%D7%A9.jpg/960px-%D7%A2%D7%95%D7%9E%D7%A8_%D7%90%D7%A6%D7%99%D7%9C%D7%99_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%91%22%D7%A9.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D7%A2%D7%95%D7%9E%D7%A8_%D7%90%D7%A6%D7%99%D7%9C%D7%99_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%91%22%D7%A9.jpg', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY-SA 4.0', date: '2025-11-03', focus: '55% 18%', zoom: 2.4 },
  ],
  'adi-yona': [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/%D7%A2%D7%93%D7%99_%D7%99%D7%95%D7%A0%D7%94_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%91%22%D7%A9_2026.jpg/960px-%D7%A2%D7%93%D7%99_%D7%99%D7%95%D7%A0%D7%94_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%91%22%D7%A9_2026.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D7%A2%D7%93%D7%99_%D7%99%D7%95%D7%A0%D7%94_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%91%22%D7%A9_2026.jpg', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY 4.0', date: '2026-02-09', focus: '47% 24%', zoom: 2.4 },
  ],
  'gil-cohen': [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/%D7%92%D7%99%D7%9C_%D7%9B%D7%94%D7%9F_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D.jpg/960px-%D7%92%D7%99%D7%9C_%D7%9B%D7%94%D7%9F_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D7%92%D7%99%D7%9C_%D7%9B%D7%94%D7%9F_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D.jpg', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY 4.0', date: '2024-11-18', focus: '63% 15%' },
  ],
  'yarden-cohen': [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/%D7%99%D7%A8%D7%93%D7%9F_%D7%9B%D7%94%D7%9F_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%22%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%9E%D7%9B%D7%91%D7%99_%D7%A0%D7%AA%D7%A0%D7%99%D7%94_2026.png/960px-%D7%99%D7%A8%D7%93%D7%9F_%D7%9B%D7%94%D7%9F_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%22%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%9E%D7%9B%D7%91%D7%99_%D7%A0%D7%AA%D7%A0%D7%99%D7%94_2026.png', page: 'https://commons.wikimedia.org/wiki/File:%D7%99%D7%A8%D7%93%D7%9F_%D7%9B%D7%94%D7%9F_%D7%91%D7%9E%D7%93%D7%99_%D7%91%D7%99%D7%AA%22%D7%A8_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D_%D7%9C%D7%A4%D7%A0%D7%99_%D7%94%D7%9E%D7%A9%D7%97%D7%A7_%D7%A0%D7%92%D7%93_%D7%9E%D7%9B%D7%91%D7%99_%D7%A0%D7%AA%D7%A0%D7%99%D7%94_2026.png', author: 'Noam Uzan (נועם אוזן)', license: 'CC BY 4.0', date: '2026-02-23', focus: '49% 28%', zoom: 3.2 },
  ],
}

const SEEDS: Seed[] = [
  // Stage 1 — five players to start with
  { id: 'yarden-shua', first: 'ירדן', last: 'שועה', number: 7, position: 'forward', priority: 1, page: 'yarden_shua', say: { last: 'שׁוּעָה' }, note: `${BOTH_SOURCES}. קפטן הקבוצה` },
  { id: 'miguel-silva', first: 'מיגל', last: 'סילבה', number: 55, position: 'goalkeeper', priority: 2, page: 'miguel_silva', say: { first: 'מִיגֶל' }, firstAliases: ['מיגאל'], lastAliases: ['סילווה', 'סילוה'] },
  { id: 'shon-weissman', first: 'שון', last: 'וייסמן', number: 19, position: 'forward', priority: 3, page: 'שון-וייסמן', firstAliases: ['שאון'], lastAliases: ['ויסמן', 'וויסמן', 'וייצמן'] },
  { id: 'omer-atzili', first: 'עומר', last: 'אצילי', number: 77, position: 'forward', priority: 4, page: 'omer_atzili', say: { last: 'אַצִילִי' } },
  { id: 'eugene-ansah', first: "יוג'ין", last: 'אנסה', number: 13, position: 'forward', priority: 6, page: 'יוגין-אנסה', say: { first: "יוּגִ'ין", last: 'אַנְסָה' }, firstAliases: ['יוגן'], lastAliases: ['אנסא', 'אנסאה'] },

  // Stage 2
  { id: 'johnbosco-kalu', first: "ג'ונבוסקו", last: 'קאלו', number: 9, position: 'forward', priority: 7, page: 'גונבוסקו-קאלו', say: { first: "ג'וֹנְבּוֹסְקוֹ", last: 'קָאלוּ' }, aliases: ['סמואל קאלו'], firstAliases: ['סמואל', "ג'ון בוסקו", 'בוסקו'], lastAliases: ['קלו'], note: `${BOTH_SOURCES}. "סמואל קאלו" הוא אותו שחקן` },
  { id: 'adi-yona', first: 'עדי', last: 'יונה', number: 10, position: 'midfielder', priority: 5, page: 'adi_yona' },
  { id: 'timothy-muzie', first: 'טימוטי', last: 'מוזי', number: 11, position: 'midfielder', priority: 8, page: 'timothy_muzie', say: { last: 'מוּזִי' }, firstAliases: ['טימותי', 'טים'], lastAliases: ['מוזה', 'מוזיה'] },
  { id: 'daniel-worko', first: 'דניאל', last: 'וורקו', number: 26, position: 'midfielder', priority: 9, page: 'דניאל-וורקו', say: { last: 'וֶורְקוֹ' }, firstAliases: ['דני', "דג'אץ"], lastAliases: ['ורקו'], note: `${BOTH_SOURCES}. בהתאחדות רשום "דג'אץ וורקו"` },
  { id: 'luka-gadrani', first: 'לוקה', last: 'גדראני', number: 44, position: 'defender', priority: 10, page: 'לוקה-גדראני', say: { last: 'גַּדְרָאנִי' }, lastAliases: ['גדרני'] },

  // Stage 3
  { id: 'brayan-carabali', first: 'בריאן', last: 'קרבאלי', number: 4, position: 'defender', priority: 11, page: 'בריאן-קרבאלי', say: { last: 'קָרַבָּאלִי' }, firstAliases: ['בראיין', 'בראיאן', 'בריין'], lastAliases: ['קרבלי', 'קראבאלי'] },
  { id: 'gil-cohen', first: 'גיל', last: 'כהן', number: 5, position: 'defender', priority: 12, page: 'gil_cohen' },
  { id: 'ziv-ben-shimol', first: 'זיו', last: 'בן שימול', number: 8, position: 'midfielder', priority: 13, page: 'זיו-בן-שימול', lastAliases: ['בנשימול', 'שימול'] },
  { id: 'boris-enow', first: 'בוריס', last: 'אינו', number: 40, position: 'midfielder', priority: 14, page: 'בוריס-אינו', say: { last: 'אֶנוֹ' }, lastAliases: ['אנו', 'אינאו', 'אנאו'], note: `${BOTH_SOURCES}. בהתאחדות: בוריס אינאו טאקאנג` },
  { id: 'nana-antwi', first: 'נאנא', last: 'אנטווי', number: 2, position: 'defender', priority: 15, page: 'נאנא-אנטווי', say: { first: 'נָאנָא' }, firstAliases: ['ננה', 'נאנה'], lastAliases: ['אנטוי'] },
  { id: 'roey-elimelech', first: 'רועי', last: 'אלימלך', number: 14, position: 'defender', priority: 16, page: 'רועי-אלימלך' },
  { id: 'alexis-serna', first: 'אלכסיס', last: 'סרנה', number: 80, position: 'midfielder', priority: 17, say: { last: 'סֶרְנָה' }, firstAliases: ['אלקסיס'], note: 'מאומת מול ההתאחדות (רישום 16/09/2026, מספר 80 בטפסי המשחק). טרם עודכן באתר המועדון' },
  { id: 'ori-azo', first: 'אורי', last: 'עזו', number: 23, position: 'forward', priority: 18, say: { last: 'עַזוֹ' }, lastAliases: ['אזו'], note: 'מאומת מול ההתאחדות (בהשאלה ממכבי ת"א, מספר 23 בטפסי המשחק). טרם עודכן באתר המועדון' },
  { id: 'tomer-yosefi', first: 'תומר', last: 'יוספי', number: 30, position: 'midfielder', priority: 19, page: 'תומר-יוספי' },
  { id: 'liel-deri', first: 'ליאל', last: 'דרעי', number: 25, position: 'defender', priority: 20, page: 'ליאל-דרעי', lastAliases: ['דרי'] },

  // Stage 4 — the rest of the squad
  { id: 'noam-muche', first: 'נועם', last: "מוצ'ה", number: 15, position: 'midfielder', priority: 21, page: 'נועם-מוצה', say: { last: "מוּצֶ'ה" }, lastAliases: ['מוצה', "מוצ'י"] },
  { id: 'yarden-cohen', first: 'ירדן', last: 'כהן', number: 16, position: 'defender', priority: 22, page: 'ירדן-כהן', note: 'אתר המועדון (16). לא הופיע בסגל משחק העונה — ייתכן שפצוע' },
  { id: 'nevo-shedo', first: 'נבו', last: 'שדו', number: 91, position: 'defender', priority: 23, page: 'נבו-שדו', say: { last: 'שֶׁדוֹ' }, lastAliases: ['שאדו', 'שידו'] },
  { id: 'yehonatan-ozer', first: 'יהונתן', last: 'עוזר', number: 22, position: 'goalkeeper', priority: 24, page: 'יהונתן-עוזר', firstAliases: ['יונתן'] },
  { id: 'dvir-nir', first: 'דביר', last: 'ניר', number: 33, position: 'goalkeeper', priority: 25, page: 'דביר-ניר' },
  { id: 'ravid-abergil', first: 'רביד', last: "אברג'יל", number: 18, position: 'midfielder', priority: 26, page: 'רביד-אברגיל', say: { last: "אַבֶּרְגִ'יל" }, lastAliases: ['אברגיל'], note: 'ההתאחדות ו-Transfermarkt: 18. באתר המועדון מופיע בטעות 30 (המספר של תומר יוספי)' },
  { id: 'yan-shicot', first: 'יאן', last: 'שיקוט', number: 21, position: 'forward', priority: 27, say: { last: 'שִׁיקוֹט' }, note: 'מאומת מול ההתאחדות (מספר 21 בטפסי המשחק). אין עמוד באתר המועדון' },

  // Registered with the IFA only, never in a matchday squad — off until a parent turns them on.
  { id: 'michael-vaknin', first: 'מיכאל', last: 'ואקנין', number: null, position: 'unknown', priority: 90, active: false, verified: false, note: 'רשום בהתאחדות בלבד; מספר ותפקיד לא אומתו' },
  { id: 'itay-shoshan', first: 'איתיי', last: 'שושן', number: null, position: 'unknown', priority: 91, active: false, verified: false, note: 'רשום בהתאחדות בלבד; מספר ותפקיד לא אומתו' },
]

export const SEED_PLAYERS: Player[] = SEEDS.map((s) => make({ ...s, photos: PHOTOS[s.id] }))
