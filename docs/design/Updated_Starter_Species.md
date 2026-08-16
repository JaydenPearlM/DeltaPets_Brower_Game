Information about shared Species



Elements:



export type SharedElementLine =

&#x20; | "null\_element"

&#x20; | "water"

&#x20; | "fire"

&#x20; | "earth"

&#x20; | "air"

&#x20; | "ice"

&#x20; | "storm"

&#x20; | "light"

&#x20; | "shadow";

export type MainStats = {

&#x20; hp: number;

&#x20; atk: number;

&#x20; def: number;

&#x20; spd: number;

&#x20; magi: number;

&#x20; mana: number;

/\*\*

&#x20;\* Rolls "IV" allocation points (default 7).

&#x20;\* These are NOT base stats. These are added at level 1 via pet\_stat\_allocations.

&#x20;\*/

export function rollIV(points = 7): MainStats {

&#x20; const keys: (keyof MainStats)\[] = \["hp", "atk", "def", "spd", "magi", "mana"];

&#x20; const iv: MainStats = { hp: 0, atk: 0, def: 0, spd: 0, magi: 0, mana: 0 };



&#x20; for (let i = 0; i < points; i++) {

&#x20;   const k = keys\[cryptoRandomInt(keys.length)];

&#x20;   iv\[k] += 1;

&#x20; }



&#x20; return iv;

}






**Eggs get their Baseline Stats at Egg Stage, that are a total of 10 ==> Not random**

Eggs Stage also decides between two Stats that are a strength and level Faster and one weak Stat.


These are Random as well

***A strong Stat, a second strong Stat, and a weak stat***



***A strong stat, a weak stat***



***A weak stat***



***A strong stat***



***No strong or weak Stats.***



**At level one the Delta pets are hatchlings, upon hatch, the get 7 stats randomly placed around the Base Stats**



**At level 2+ The Deltas get 5 points and the User picks the stat they want.

Because of How immutable stats are after egg hatches, I will say every evolution line Is their Base egg stats.**





Training Elements have not been fleshed out yet.



Start Eggs:



Hatchling: Mizu

Lowform: Mizule

Highform: Zulelon

Legion: Aquilyth

Mythical legendary:  (Not yet Fleshed out)



base stats:



line: "water",    

&#x20;     hp: 1,

&#x20;     atk: 1,

&#x20;     magi: 3,

&#x20;     def: 2,

&#x20;     spd: 2,

&#x20;     mana: 1,

&#x20;     base\_total: 10,



\------------------------------



Hatchling: Kindle

Lowform: Moltikyn

Highform:  Magnakyn

Legion: Lavakyn

Mythical Legendary:  (Not yet Fleshed out)



base Stats:



line: "fire",    

&#x20;     hp: 2,

&#x20;     atk: 3,

&#x20;     magi: 1,

&#x20;     def: 1,

&#x20;     spd: 3,

&#x20;     mana: 0,

&#x20;     base\_total: 10,



\-----------------------------



Hatchling: Twiglet

Lowform: Rootle

Highform: Radaroot

Legion: Roovine

Mythical Legendary: (Not yet Fleshed out)



base stats:



&#x20;line: "earth",

&#x20;     hp: 2,

&#x20;     atk: 1,

&#x20;     magi: 2,

&#x20;     def: 2,

&#x20;     spd: 1,

&#x20;     mana: 2,

&#x20;     base\_total: 10,



\------------------------------



Hatchling: Wistpip

Lowform: Zephyx

High Form: Phyxlion

Legion: Phyxion

Mythical Legendary: (Not yet fleshed out)



base Stats:



line: "air"

&#x20;     hp: 1,

&#x20;     atk: 2,

&#x20;     magi: 2,

&#x20;     def: 1,

&#x20;     spd: 4,

&#x20;     mana: 0,

&#x20;     base\_total: 10,



\--------------------------------



Hatchling: Cribi

Lowform: Cribit

High Form: Crabbit

Legion: Crionyx

Mythical Legendary: (Not yet Fleshed out)



base stats:



&#x20; line: "ice",    

&#x20;     hp: 2,

&#x20;     atk: 0,

&#x20;     magi: 2,

&#x20;     def: 1,

&#x20;     spd: 2,

&#x20;     mana: 3,

&#x20;     base\_total: 10,



\---------------------------------



Hatchling: Volb

Lowform: Voltlet

Highform: Tovote

Legion: Voltaris

Mythical Legendary: (Not fleshed out yet)



base stats:



line: "storm",    

&#x20;     hp: 1,

&#x20;     atk: 5,

&#x20;     magi: 0,

&#x20;     def: 0,

&#x20;     spd: 4,

&#x20;     mana: 0,

&#x20;     base\_total: 10,

&#x20;   

\---------------------------------



Hatchling: Solen

Lowform: Solkit

Highform: Solaryn

Legion: Angelyx

Mythical Legendary: (Not fleshed out yet)



base Stats:



&#x20;line: "light",    

&#x20;     hp: 2,

&#x20;     atk: 2,

&#x20;     magi: 2,

&#x20;     def: 2,

&#x20;     spd: 2,

&#x20;     mana: 0,

&#x20;     base\_total: 10,



\------------------------------------



Hatchling: Esperon

LowForm: Bad personality: Noctimp

HighForm: Nightmareimp

Legion: Espereonite

Mythical legendary: (Not Fleshed out yet)



base Stats:



line: "shadow",    

&#x20;     hp: 1,

&#x20;     atk: 0,

&#x20;     magi: 4,

&#x20;     def: 1,

&#x20;     spd: 1,

&#x20;     mana: 3,

&#x20;     base\_total: 10,



\-------------------------------------



Hatchling: Esperon

Lowform: Good personality: Nightclaw

High Form: Shadeclaw

Legion: Nightvielclaw

Mythical Legendary: (Not yet fleshed out)



base stats:



line: "shadow",    

&#x20;     hp: 1,

&#x20;     atk: 4,

&#x20;     magi: 1,

&#x20;     def: 1,

&#x20;     spd: 3,

&#x20;     mana: 0,

&#x20;     base\_total: 10,





Null\_gender and Null\_Element:  These need to be fleshed out some more.  They Can't evolve normally, they cannot train elements, stats work the same though. More experience to level, 
cant breed, Can only use Null element Skills.









