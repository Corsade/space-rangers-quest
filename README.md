# Онлайн плеер квестов из Космических рейнджеров

## Эта копия: GitHub Pages

[Играть](https://corsade.github.io/space-rangers-quest/#/quests)

- Форк исходного плеера; автоматическая сборка и публикация из `master` через `.github/workflows/pages.yml`.
- В `src/webstatic/data/` сохранён полный публичный каталог https://spacerangers.gitlab.io/data/index.json: 149 квестов (114 русских, 35 английских), 659 изображений, 21 звук и 29 музыкальных треков. Сборка не скачивает их с исходного сайта.
- MIT-лицензия относится к коду плеера; заимствованные игровые материалы не перелицензированы и сохраняют права своих авторов. Исходный проект и данные: https://gitlab.com/spacerangers/spacerangers.gitlab.io.
- Сохранения остаются в браузере. Облачная авторизация, синхронизация и таблицы лидеров — внешний Firebase исходного проекта, не перенесённый личный сервер.
- Исправлены абсолютные пути интерфейса и service worker для размещения в подпапке. Удалена сторонняя аналитика.

Локальная проверка и сборка (Node.js 22, Python 3.9+):

```sh
npm ci --legacy-peer-deps --no-audit --no-fund
python3 scripts/check-data.py
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
python3 -m http.server 4099 --directory built-web
```

Открыть http://localhost:4099/#/quests. Проверка данных также подготавливает `borrowed/qm/Online/` для существующих тестов; эти производные файлы не коммитятся.


[Играть можно тут](https://spacerangers.gitlab.io)

Если не открывается то попробуйте через VPN.

Должно работать во всех современных браузерах

## Происхождение

Основан на описании формата qm `lastqm.txt` и исследовании поведения TGE 4.3.0/5.2.10.

## Сборка

- Файлы квестов (_.qm, _.qmm) нужно извлечь из игры и положить в `borrowed/qm/SR 2.1.2170/`
  - и/или в `borrowed/qm/SR 2.1.2121 eng/`
  - и/или в `borrowed/qm/Tge 4.2.5/`
  - и/или в `borrowed/qm/anyNameHere/`
- Картинки в `borrowed/qm/img/`
- Звуки и музыку положить в `borrowed/sound/` и в `borrowed/track/` соответственно (даже если ничего нет то всё равно нужно эти директории создать)
- По-умолчанию музыка фоном включается рандомно из папки `borrowed/track/`. Чтобы убрать какой-то трек из рандомной ротации нужно создать файл `borrowed/track/randomignore.txt` где на каждой строчке написать имя файла который рандомно включать не нужно.
- Затем всё собрать (установив предварительно nodejs версии 16):

```
rm -R built-web || true
npm install --legacy-peer-deps
npm run lint
npm run test
mkdir built-web
npm run pack-game-data
npm run build
```

## Известные проблемы

- Автопереходы по пустым переходам/локациям работают только в режиме TGE4

## TODO

- См. `info.md`, `info2.md`

## Квесты пересохранённые

### Источник

- SR1 - из Tge 4.2.5
- SR2 - из SR 2.1.2170
- SR2 eng - из SR 2.1.2121

### Пересохранённые

- Glavred: была исправлена 184-я локация с неправильной формулой (третий текст, "...вам всего лишь {[p47])} cr..." -> "...вам всего лишь {[p47]} cr...").
- Gladiator: был пересохранен потому как там совсем какой-то древний формат
- Prison из TGE переименован в Prison1 чтобы не было коллизии
- Kidnapped сложность поставлена в 100
- Stealth исправление багов
  
## Webpack devserver

`npm start`

## Testing

This project is tested with BrowserStack
