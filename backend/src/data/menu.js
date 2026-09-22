// Elif fast food — to'liq menyu (posterlardan, ruscha).
// Bu modul seed.js va admin "reseed" endpointда ishlatiladi.
// Rasmlar mini-app/public/images/ ichida (posterlardan kesib olingan),
// URL mini-app domenida ochiladi: /images/<fayl>.jpg

const IMG = '/images';

const CAT = {
  'Лаваш': `${IMG}/lavash.jpg`,
  'Гамбургер': `${IMG}/burger.jpg`,
  'Шаурма': `${IMG}/shaurma.jpg`,
  'Хот-дог': `${IMG}/hotdog.jpg`,
  'Сендвич': `${IMG}/sendvich.jpg`,
  'КФС': `${IMG}/kfc.jpg`,
  'Блюда': `${IMG}/blyuda.jpg`,
  'Салат': `${IMG}/salat.jpg`,
  'Фри': `${IMG}/fri.jpg`,
  'Соусы': `${IMG}/sous.jpg`,
  'Десерты': `${IMG}/desert.jpg`,
  'Кофе': `${IMG}/kofe.jpg`,
  'Лимонад': `${IMG}/limonad.jpg`,
  'Чай': `${IMG}/limonad.jpg`,
  'Напитки': `${IMG}/napitki.jpg`,
  'Пицца': `${IMG}/pizza-pepperoni.jpg`,
};

const pizzas = [
  { name: 'Пепперони', img: 'pizza-pepperoni', p25: 55000, p35: 75000, d: 'Пепперони, итальянский соус, сыр моцарелла' },
  { name: 'Элиф', img: 'pizza-elif', p25: 59000, p35: 79000, d: 'Соус, моцарелла, копчёная колбаса, сосиска, бондюэль, оливки, паприка' },
  { name: 'BBQ', img: 'pizza-bbq', p25: 69000, p35: 89000, d: 'Соус, сыр моцарелла, 3 котлеты, сыр' },
  { name: 'Курица с грибами', img: 'pizza-kuritsa-gribi', p25: 64000, p35: 74000, d: 'Соус, моцарелла, куриное филе, грибы' },
  { name: 'Маргарита', img: 'pizza-margarita', p25: 44000, p35: 64000, d: 'Соус, моцарелла, помидор, оливки' },
  { name: 'Грибная', img: 'pizza-gribnaya', p25: 50000, p35: 70000, d: 'Соус, моцарелла, шампиньоны' },
  { name: 'Сырная MAX', img: 'pizza-syrnaya-max', p25: 44000, p35: 64000, d: 'Соус, сыр моцарелла' },
  { name: 'Донар', img: 'pizza-donar', p25: 69000, p35: 89000, d: 'Соус, моцарелла, мясо, красный лук, оливки' },
  { name: 'Супер комбо', img: 'pizza-super-kombo', p25: 69000, p35: 79000, d: 'Красный соус, моцарелла, кукуруза, пепперони, индейка, шампиньоны, маслины, болгарский перец, говядина барбекю' },
  { name: 'Мясо с грибами', img: 'pizza-myaso-gribi', p25: 60000, p35: 79000, d: 'Фирменный соус, моцарелла, шампиньоны, говядина' },
  { name: 'Мясное ассорти', img: 'pizza-myasnoe-assorti', p25: 79000, p35: 89000, d: 'Итальянский соус, цыплёнок барбекю, говядина барбекю, индейка, пепперони, моцарелла' },
  { name: 'Острый Мексика', img: 'pizza-ostryi-meksika', p25: 58000, p35: 78000, d: 'Соус, моцарелла, колбаса, мясо, шампиньоны, паприка, оливки, халапеньо, чили соус, индейка' },
  { name: 'Кази', img: 'pizza-kazi', p25: 69000, p35: 89000, d: 'Соус, моцарелла, кази, мясо, красный лук' },
  { name: 'Четыре сезона', img: 'pizza-chetyre-sezona', p25: 58000, p35: 78000, d: 'Соус, моцарелла, пепперони, колбаса, мясо, шампиньоны, помидоры, бондюэль' },
];

const pizzaItems = pizzas.flatMap((z) => [
  { category: 'Пицца', name: `Пицца ${z.name} 25 см`, newPrice: z.p25, description: z.d, image: `${IMG}/${z.img}.jpg` },
  { category: 'Пицца', name: `Пицца ${z.name} 35 см`, newPrice: z.p35, description: z.d, image: `${IMG}/${z.img}.jpg` },
]);

const menu = [
  // ---------- Лаваш ----------
  { category: 'Лаваш', name: 'Лаваш', newPrice: 38000, description: 'Мясо, картофель фри, овощи, соус' },
  { category: 'Лаваш', name: 'Лаваш биг', newPrice: 42000, description: 'Большой, мясо, фри, овощи, соус' },
  { category: 'Лаваш', name: 'Лаваш мини', newPrice: 34000, description: 'Маленький, мясо, фри, соус' },
  { category: 'Лаваш', name: 'Лаваш тандир', newPrice: 48000, description: 'Тандыр, мясо, овощи, соус' },
  { category: 'Лаваш', name: 'Лаваш тандир куриный', newPrice: 40000, description: 'Тандыр, курица, овощи, соус' },
  { category: 'Лаваш', name: 'Лаваш с сыром', newPrice: 40000, description: 'Мясо, сыр, фри, овощи, соус' },
  { category: 'Лаваш', name: 'Лаваш мини с сыром', newPrice: 36000, description: 'Маленький, сыр, мясо, соус' },
  { category: 'Лаваш', name: 'Лаваш биг с сыром', newPrice: 46000, description: 'Большой, сыр, мясо, фри, соус' },
  { category: 'Лаваш', name: 'Лаваш куриный', newPrice: 32000, description: 'Курица, фри, овощи, соус' },
  { category: 'Лаваш', name: 'Лаваш куриный мини', newPrice: 30000, description: 'Маленький, курица, фри, соус' },
  { category: 'Лаваш', name: 'Лаваш куриный биг', newPrice: 34000, description: 'Большой, курица, фри, овощи, соус' },

  // ---------- Гамбургер ----------
  { category: 'Гамбургер', name: 'Гамбургер', newPrice: 32000, description: 'Котлета из говядины, овощи, соус' },
  { category: 'Гамбургер', name: 'Чизбургер', newPrice: 36000, description: 'Котлета, сыр чеддер, овощи, соус' },
  { category: 'Гамбургер', name: 'Биг бургер', newPrice: 42000, description: 'Две котлеты, овощи, фирменный соус' },
  { category: 'Гамбургер', name: 'Биг чизбургер', newPrice: 46000, description: 'Две котлеты, сыр, овощи, соус' },

  // ---------- Шаурма ----------
  { category: 'Шаурма', name: 'Донар биг', newPrice: 38000, description: 'Большой донар, мясо, овощи, соус' },
  { category: 'Шаурма', name: 'Донар мини', newPrice: 33000, description: 'Маленький донар, мясо, овощи, соус' },

  // ---------- Хот-дог ----------
  { category: 'Хот-дог', name: 'Хот-дог', newPrice: 20000, description: 'Сосиска, булочка, кетчуп, горчица' },
  { category: 'Хот-дог', name: 'Хот-дог чиз', newPrice: 23000, description: 'Сосиска, сыр, соус' },
  { category: 'Хот-дог', name: 'Хагги', newPrice: 37000, description: 'Большой хот-дог, соус' },

  // ---------- Сендвич ----------
  { category: 'Сендвич', name: 'Клаб-сендвич', newPrice: 40000, description: 'Курица, овощи, соус' },
  { category: 'Сендвич', name: 'Клаб мясной', newPrice: 40000, description: 'Мясо, овощи, соус' },

  // ---------- КФС ----------
  { category: 'КФС', name: 'Крылышки', newPrice: 38000, description: 'Куриные крылышки в панировке' },

  // ---------- Блюда ----------
  { category: 'Блюда', name: 'Донар блюдо', newPrice: 54000, description: 'Мясо донар, гарнир, соус' },
  { category: 'Блюда', name: 'Донар блюдо куриный', newPrice: 52000, description: 'Курица донар, гарнир, соус' },
  { category: 'Блюда', name: 'Искандер', newPrice: 58000, description: 'Искандер-кебаб, соус, гарнир' },

  // ---------- Салат ----------
  { category: 'Салат', name: 'Греческий салат', newPrice: 22000, description: 'Овощи, сыр, оливки, заправка' },
  { category: 'Салат', name: 'Мужской каприз', newPrice: 28000, description: 'Мясо, овощи, фирменная заправка' },

  // ---------- Фри ----------
  { category: 'Фри', name: 'Фри', newPrice: 16000, description: 'Картофель фри' },
  { category: 'Фри', name: 'Деревенское фри', newPrice: 18000, description: 'Картофель по-деревенски' },

  // ---------- Соусы ----------
  { category: 'Соусы', name: 'Сырный соус', newPrice: 3000, description: 'Сырный соус' },
  { category: 'Соусы', name: 'Чесночный соус', newPrice: 3000, description: 'Чесночный соус' },
  { category: 'Соусы', name: 'Халапеньо', newPrice: 4000, description: 'Острый соус халапеньо' },
  { category: 'Соусы', name: 'Чили соус', newPrice: 3000, description: 'Соус чили' },

  // ---------- Пицца ----------
  ...pizzaItems,

  // ---------- Десерты ----------
  { category: 'Десерты', name: 'Трайфл дубайский', newPrice: 55000, description: 'Дубайский трайфл' },
  { category: 'Десерты', name: 'Трайфл сникерс', newPrice: 50000, description: 'Трайфл со вкусом сникерса' },
  { category: 'Десерты', name: 'Трайфл клубника', newPrice: 50000, description: 'Клубничный трайфл' },
  { category: 'Десерты', name: 'Чизкейк Элиф', newPrice: 27000, description: 'Фирменный чизкейк' },

  // ---------- Кофе ----------
  { category: 'Кофе', name: 'Кофе 3/1', newPrice: 10000, description: 'Растворимый кофе 3 в 1' },
  { category: 'Кофе', name: 'Кофе чёрный', newPrice: 8000, description: 'Чёрный кофе' },
  { category: 'Кофе', name: 'Американо', newPrice: 16000, description: 'Американо' },
  { category: 'Кофе', name: 'Капучино', newPrice: 18000, description: 'Капучино' },
  { category: 'Кофе', name: 'Латте', newPrice: 17000, description: 'Латте' },

  // ---------- Лимонад (мохито) ----------
  { category: 'Лимонад', name: 'Мохито', newPrice: 19000, description: 'Классический мохито' },
  { category: 'Лимонад', name: 'Мохито клубника', newPrice: 19000, description: 'Мохито со вкусом клубники' },
  { category: 'Лимонад', name: 'Мохито малина', newPrice: 19000, description: 'Мохито со вкусом малины' },
  { category: 'Лимонад', name: 'Мохито киви', newPrice: 19000, description: 'Мохито со вкусом киви' },
  { category: 'Лимонад', name: 'Мохито маракуйя', newPrice: 19000, description: 'Мохито со вкусом маракуйи' },
  { category: 'Лимонад', name: 'Мохито тропик', newPrice: 19000, description: 'Мохито тропик' },
  { category: 'Лимонад', name: 'Мохито лесная ягода', newPrice: 19000, description: 'Мохито лесная ягода' },
  { category: 'Лимонад', name: 'Мохито баба гам', newPrice: 19000, description: 'Мохито баба гам' },
  { category: 'Лимонад', name: 'Мохито синее Гавайи', newPrice: 19000, description: 'Мохито синее Гавайи' },
  { category: 'Лимонад', name: 'Мохито смородина', newPrice: 19000, description: 'Мохито чёрная смородина' },
  { category: 'Лимонад', name: 'Мохито апельсин', newPrice: 19000, description: 'Мохито апельсин' },

  // ---------- Чай ----------
  { category: 'Чай', name: 'Чай клубника', newPrice: 15000, description: 'Фруктовый чай клубника' },
  { category: 'Чай', name: 'Чай малина', newPrice: 15000, description: 'Фруктовый чай малина' },
  { category: 'Чай', name: 'Чай киви', newPrice: 15000, description: 'Фруктовый чай киви' },
  { category: 'Чай', name: 'Чай маракуйя', newPrice: 15000, description: 'Фруктовый чай маракуйя' },
  { category: 'Чай', name: 'Чай тропик', newPrice: 15000, description: 'Фруктовый чай тропик' },
  { category: 'Чай', name: 'Чай лесная ягода', newPrice: 15000, description: 'Фруктовый чай лесная ягода' },
  { category: 'Чай', name: 'Чай смородина', newPrice: 15000, description: 'Фруктовый чай смородина' },
  { category: 'Чай', name: 'Чай апельсин', newPrice: 15000, description: 'Фруктовый чай апельсин' },
  { category: 'Чай', name: 'Чай с лимоном', newPrice: 12000, description: 'Горячий чай с лимоном' },

  // ---------- Напитки ----------
  { category: 'Напитки', name: 'Пепси 0.4 л', newPrice: 9000, description: 'Пепси розлив 400 мл' },
  { category: 'Напитки', name: 'Пепси 1.5 л', newPrice: 18000, description: 'Пепси 1.5 литра' },
  { category: 'Напитки', name: 'Пепси 1 л', newPrice: 12000, description: 'Пепси 1 литр' },
  { category: 'Напитки', name: 'Пепси 0.5 л', newPrice: 8000, description: 'Пепси 0.5 литра' },
  { category: 'Напитки', name: 'Кола 1.5 л', newPrice: 18000, description: 'Coca-Cola 1.5 литра' },
  { category: 'Напитки', name: 'Кола 1 л', newPrice: 14000, description: 'Coca-Cola 1 литр' },
  { category: 'Напитки', name: 'Кола 0.5 л', newPrice: 8000, description: 'Coca-Cola 0.5 литра' },
  { category: 'Напитки', name: 'Кола бутылочная', newPrice: 5000, description: 'Coca-Cola в бутылке' },
  { category: 'Напитки', name: 'Сок 1 л', newPrice: 17000, description: 'Натуральный сок 1 литр' },
  { category: 'Напитки', name: 'Сок 200 мл', newPrice: 4000, description: 'Натуральный сок 200 мл' },
];

// Har bir mahsulotga rasm biriktirilgan yakuniy ro'yxat
export const menuData = menu.map((p) => ({
  category: p.category,
  name: p.name,
  description: p.description,
  newPrice: p.newPrice,
  oldPrice: null,
  image: p.image || CAT[p.category] || CAT['Пицца'],
}));

export default menuData;
