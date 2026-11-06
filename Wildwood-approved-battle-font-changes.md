filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 1
old_code: (insertion)
new_code:
```css
@import url("https://fonts.googleapis.com/css2?family=Rubik+Glitch&display=swap");

```
description: Load the approved Google Font for Wildwood.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 796
old_code:
```css
.ww-battle-intro__title {
  z-index: 2;
  color: var(--dp-title-gold, #ffdf75);
  font-family: var(--font-heading);
  font-size: clamp(1.5rem, 13cqw, 5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.04em;
  text-shadow: 2px 3px 0 #061426, -2px -2px 0 #061426,
    0 0 14px #67e8f9, 0 0 28px #a970ed;
  animation: wwIntroImpact 1500ms ease both;
}
```
new_code:
```css
.ww-battle-intro__title {
  z-index: 2;
  color: #ed393f;
  font-family: "Rubik Glitch", Impact, fantasy;
  font-size: clamp(1.5rem, 17cqw, 6rem);
  font-weight: 400;
  font-synthesis: none;
  line-height: 1;
  letter-spacing: 0.015em;
  rotate: -2deg;
  background-color: #ed393f;
  background-image:
    radial-gradient(ellipse at 18% 24%, #290b15 0 4%, transparent 6%),
    radial-gradient(ellipse at 72% 68%, #400c18 0 6%, transparent 9%),
    radial-gradient(ellipse at 44% 40%, #170b15 0 3%, transparent 5%),
    radial-gradient(ellipse at 88% 18%, #4a111e 0 5%, transparent 7%),
    linear-gradient(#ff5554, #c31329);
  background-size: 43px 37px, 67px 51px, 29px 41px, 83px 61px, 100% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(2px 3px 0 #100b18) drop-shadow(0 0 9px #b51c38) drop-shadow(0 0 18px #65295e);
  animation: wwIntroImpact 1500ms ease both;
}
```
description: Apply the approved red mottled Rubik Glitch lettering; retain existing animation timing.
