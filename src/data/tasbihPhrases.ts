export interface TasbihPhrase {
  id: string;
  text: string;
  category: 'تسبيح' | 'تحميد' | 'تهليل' | 'تكبير' | 'استغفار' | 'حوقلة' | 'صلاة على النبي' | 'تسبيح مركب' | 'جامع';
  recommendedCount: number;
  description: string;
  arabicDescription?: string;
  benefit?: string;
}

export const tasbihPhrases: TasbihPhrase[] = [
  // ==================== التسبيح ====================
  {
    id: 'subhanallah',
    text: 'سبحان الله',
    category: 'تسبيح',
    recommendedCount: 33,
    description: 'تنزيه الله عن كل نقص',
    benefit: 'قال صلى الله عليه وسلم: "من سبح الله في دبر كل صلاة ثلاثاً وثلاثين... غفرت له خطاياه وإن كانت مثل زبد البحر"',
  },
  {
    id: 'subhanallah_wa_bi_hamdih',
    text: 'سبحان الله وبحمده',
    category: 'تسبيح مركب',
    recommendedCount: 100,
    description: 'تنزيه الله مع حمده',
    benefit: 'قال صلى الله عليه وسلم: "من قال سبحان الله وبحمده في يوم مائة مرة حطت خطاياه وإن كانت مثل زبد البحر"',
  },
  {
    id: 'subhanallah_al_azim',
    text: 'سبحان الله العظيم',
    category: 'تسبيح',
    recommendedCount: 33,
    description: 'تنزيه الله العظيم',
    benefit: 'وهي من أحب الكلام إلى الله',
  },
  {
    id: 'subhanallah_wa_bi_hamdih_subhanallah_al_azim',
    text: 'سبحان الله وبحمده، سبحان الله العظيم',
    category: 'تسبيح مركب',
    recommendedCount: 10,
    description: 'تسبيح مركب جامع',
    benefit: 'كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن',
  },
  {
    id: 'subhan_al_malik_al_quddus',
    text: 'سبحان الملك القدوس',
    category: 'تسبيح',
    recommendedCount: 3,
    description: 'تنزيه الملك القدوس',
    benefit: 'يقال بعد الوتر',
  },

  // ==================== التحميد ====================
  {
    id: 'alhamdulillah',
    text: 'الحمد لله',
    category: 'تحميد',
    recommendedCount: 33,
    description: 'الثناء على الله بصفاته الحميدة',
    benefit: 'قال صلى الله عليه وسلم: "الحمد لله تملأ الميزان"',
  },
  {
    id: 'alhamdulillah_hakka',
    text: 'الحمد لله حمداً كثيراً طيباً مباركاً فيه',
    category: 'تحميد',
    recommendedCount: 3,
    description: 'حمد كثير طيب مبارك فيه',
    benefit: 'قال صلى الله عليه وسلم: "لقد رأيت اثني عشر ملكاً يبتدرونها أيُّهم يرفعها"',
  },
  {
    id: 'alhamdulillah_al_azim',
    text: 'الحمد لله رب العالمين',
    category: 'تحميد',
    recommendedCount: 7,
    description: 'حمد الله رب العالمين',
    benefit: 'هي فاتحة الكتاب وأم القرآن',
  },

  // ==================== التهليل ====================
  {
    id: 'la_ilaha_illa_allah',
    text: 'لا إله إلا الله',
    category: 'تهليل',
    recommendedCount: 100,
    description: 'توحيد الله ونفي الأنداد عنه',
    benefit: 'قال صلى الله عليه وسلم: "أفضل الذكر لا إله إلا الله"',
  },
  {
    id: 'la_ilaha_illa_allah_wahdah',
    text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
    category: 'تهليل',
    recommendedCount: 10,
    description: 'التوحيد الخالص مع إثبات الملك والحمد والقدرة',
    benefit: 'قال صلى الله عليه وسلم: "من قالها عشر مرار كان كمن أعتق أربعة أنفس من ولد إسماعيل"',
  },
  {
    id: 'la_ilaha_illa_allah_wahdah_100',
    text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
    category: 'تهليل',
    recommendedCount: 100,
    description: 'التوحيد الخالص مئة مرة',
    benefit: 'كانت له عدل عشر رقاب، وكتبت له مئة حسنة، ومحيت عنه مئة سيئة، وكانت له حرزاً من الشيطان يومه ذلك حتى يمسي',
  },
  {
    id: 'muhammad_rasul_allah',
    text: 'محمد رسول الله',
    category: 'تهليل',
    recommendedCount: 1,
    description: 'الشهادة بالرسالة',
    benefit: 'جزء من الشهادتين',
  },

  // ==================== التكبير ====================
  {
    id: 'allahu_akbar',
    text: 'الله أكبر',
    category: 'تكبير',
    recommendedCount: 33,
    description: 'تعظيم الله وإعلاء شأنه',
    benefit: 'قال صلى الله عليه وسلم: "الله أكبر تملأ ما بين السماء والأرض"',
  },
  {
    id: 'allahu_akbar_kabira',
    text: 'الله أكبر كبيراً',
    category: 'تكبير',
    recommendedCount: 10,
    description: 'التكبير مع التأكيد',
    benefit: 'من الأذكار المشروعة في دبر الصلوات',
  },
  {
    id: 'allahu_akbar_wa_lillahil_hamd',
    text: 'الله أكبر ولله الحمد',
    category: 'تكبير',
    recommendedCount: 33,
    description: 'التكبير والحمد معاً',
    benefit: 'تقال في أيام التشريق والتكبير المطلق',
  },

  // ==================== الاستغفار ====================
  {
    id: 'astaghfirullah',
    text: 'استغفر الله',
    category: 'استغفار',
    recommendedCount: 100,
    description: 'طلب المغفرة من الله',
    benefit: 'قال صلى الله عليه وسلم: "من لزم الاستغفار جعل الله له من كل ضيق مخرجاً ومن كل هم فرجاً ورزقه من حيث لا يحتسب"',
  },
  {
    id: 'astaghfirullah_al_azim',
    text: 'استغفر الله العظيم',
    category: 'استغفار',
    recommendedCount: 100,
    description: 'طلب المغفرة من الله العظيم',
    benefit: 'وهو سيد الاستغفار إذا أتمه',
  },
  {
    id: 'astaghfirullah_wa_atoobu_ilayh',
    text: 'استغفر الله وأتوب إليه',
    category: 'استغفار',
    recommendedCount: 100,
    description: 'الاستغفار مقروناً بالتوبة',
    benefit: 'قال صلى الله عليه وسلم: "إنه ليغان على قلبي وإني لأستغفر الله في اليوم مائة مرة"',
  },
  {
    id: 'rabbana_ghfir_lana',
    text: 'ربنا اغفر لنا',
    category: 'استغفار',
    recommendedCount: 10,
    description: 'دعاء بالمغفرة',
    benefit: 'دعاء قرآني',
  },

  // ==================== الحوقلة ====================
  {
    id: 'la_haula_wa_la_quwwata_illa_billah',
    text: 'لا حول ولا قوة إلا بالله',
    category: 'حوقلة',
    recommendedCount: 100,
    description: 'إثبات أن الحول والقوة كلها لله',
    benefit: 'قال صلى الله عليه وسلم: "ألا أدلك على كنز من كنوز الجنة: لا حول ولا قوة إلا بالله"',
  },
  {
    id: 'la_haula_wa_la_quwwata_illa_billah_al_ali',
    text: 'لا حول ولا قوة إلا بالله العلي العظيم',
    category: 'حوقلة',
    recommendedCount: 10,
    description: 'الحوقلة مع وصف الله بالعلو والعظمة',
    benefit: 'وهي من أعظم الأذكار',
  },

  // ==================== الصلاة على النبي ====================
  {
    id: 'salla_allahu_alayhi_wa_sallam',
    text: 'صلى الله عليه وسلم',
    category: 'صلاة على النبي',
    recommendedCount: 1,
    description: 'الصلاة على النبي عند ذكره',
    benefit: 'قال صلى الله عليه وسلم: "من صلى علي واحدة صلى الله عليه بها عشراً"',
  },
  {
    id: 'allahumma_salli_ala_muhammad',
    text: 'اللهم صل على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد',
    category: 'صلاة على النبي',
    recommendedCount: 10,
    description: 'الصلاة الإبراهيمية على النبي',
    benefit: 'وهي الصلاة التي نقرأها في التشهد',
  },
  {
    id: 'allahumma_salli_wasallim',
    text: 'اللهم صل وسلم على نبينا محمد',
    category: 'صلاة على النبي',
    recommendedCount: 100,
    description: 'الصلاة والتسليم على النبي',
    benefit: 'من صلى علي مائة مرة قضيت حاجته',
  },

  // ==================== التسبيح المركب ====================
  {
    id: 'la_ilaha_illa_allah_subhanallah',
    text: 'لا إله إلا الله والله أكبر وسبحان الله والحمد لله',
    category: 'جامع',
    recommendedCount: 10,
    description: 'جمع كلمات الذكر الأربع',
    benefit: 'وهن أحب الكلام إلى الله',
  },
  {
    id: 'subhanallah_wal_hamdulillah',
    text: 'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر',
    category: 'جامع',
    recommendedCount: 33,
    description: 'التسبيح والتحميد والتهليل والتكبير',
    benefit: 'قال صلى الله عليه وسلم: "لأن أقول سبحان الله والحمد لله ولا إله إلا الله والله أكبر أحب إلي مما طلعت عليه الشمس"',
  },
  {
    id: 'hasbuna_allah_wa_nimal_wakil',
    text: 'حسبنا الله ونعم الوكيل',
    category: 'جامع',
    recommendedCount: 7,
    description: 'التوكل على الله',
    benefit: 'قالها إبراهيم عليه السلام حين ألقي في النار',
  },
  {
    id: 'hasbiyallah',
    text: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم',
    category: 'جامع',
    recommendedCount: 7,
    description: 'التوكل على الله مع التوحيد',
    benefit: 'قال صلى الله عليه وسلم: "من قالها حين يصبح وحين يمسي سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة"',
  },
  {
    id: 'bismillah',
    text: 'بسم الله الرحمن الرحيم',
    category: 'جامع',
    recommendedCount: 1,
    description: 'التسمية قبل كل عمل',
    benefit: 'قيل: كل أمر ذي بال لم يبدأ فيه ببسم الله فهو أقطع',
  },
  {
    id: 'ma_shaa_allah',
    text: 'ما شاء الله',
    category: 'جامع',
    recommendedCount: 1,
    description: 'التعجب والإعجاب مع نسبته لمشيئة الله',
    benefit: 'تقى العين والحسد بإذن الله',
  },
  {
    id: 'tabarakallah',
    text: 'تبارك الله',
    category: 'جامع',
    recommendedCount: 1,
    description: 'إثبات البركة لله',
    benefit: 'تبرك باسم الله',
  },
  {
    id: 'allahumma_ghfir_li',
    text: 'اللهم اغفر لي',
    category: 'استغفار',
    recommendedCount: 10,
    description: 'طلب المغفرة من الله مباشرة',
    benefit: 'من أفضل الدعاء',
  },
  {
    id: 'allahumma_antassalam',
    text: 'اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام',
    category: 'جامع',
    recommendedCount: 3,
    description: 'دعاء بعد السلام من الصلاة',
    benefit: 'يقال عقب كل صلاة',
  },
  {
    id: 'hayya_ala_salah',
    text: 'حي على الصلاة حي على الفلاح',
    category: 'جامع',
    recommendedCount: 1,
    description: 'نداء للأذان',
    benefit: 'نداء الأذان',
  },
];
