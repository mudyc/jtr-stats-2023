

<script>
export const prerender = true;
    import { onMount } from 'svelte';
    import { csv } from 'd3';
    import { rgb, hsl } from 'd3-color';

    import PieChart from '../chart/PieChart.svelte'
    import BarChart from '../chart/BarChart.svelte'
    import HorizBarChart from '../chart/HorizBarChart.svelte'
import { assets, base } from '$app/paths';
    let data, dataMap, boxes = []

    class ColorSystem {
        constructor(colors, scheme='sequential') {
            this._colors = colors
            this._scheme = scheme
        }
        diverging() {
            return new ColorSystem(this._colors, 'diverging')
        }
        colors(count) {
            const brighter = (color, n, i) => {
                const c = hsl(color)
                const ret =  hsl(c.h, i*c.s/n, c.l + i*(1-c.l)/n)
                return ret.rgb().clamp()
            }
            const ret = Array.from({ length: count })
            //if (this.scheme == 'sequential')
            const aRgb = rgb(this._colors[0])
            const bRgb = rgb(this._colors[1])
            ret[0] = aRgb
            ret[count-1] = bRgb
            const k = Math.floor(count/2)
            if (count % 2 == 1) ret[k] = hsl((hsl(aRgb).h + hsl(bRgb).h) / 2, 0.05, 0.95).rgb()

            for (let i=1; i<k; i++) {
                ret[i] = brighter(aRgb, k, i)
                ret[count-i-1] = brighter(bRgb, k, i)
            }
            return ret.map(v => v.hex())
        }
        
    }

    const color = new ColorSystem(['#CDB380','#036564'])

    class Data {
        constructor(d, col=null, choice='single') {
            this.data = d
            this.col = col
            this.choice = choice
            this.calculate = 'count'
            this.color = null
            this.filters = []
            this.sort = undefined
            this.groups = undefined
            this.dbg = false
            this.minVal = undefined
        }
        singleChoice(col) {
            return new Data(this.data, col, 'single')
        }
        multiChoice(col) {
            return new Data(this.data, col, 'multi')
        }
        groupChoice(grp) {
            return new Data(this.data, grp, 'group')
        }
        grps(arr) {
            this.groups = arr
            return this
        }
        kpl(col) {
            return this.data[col].filter(v => v != '').length
        }
        count() {
            this.calculate = 'count'
            return this
        }
        filterEmpty() {
            this.filters.push((acc, value) => {
                if (value != '') acc.push(value)
                return acc
            })
            return this
        }
        filterRemove(removable) {
            this.filters.push((acc, value) => {
                //console.log(value)
                if (this.choice == 'multi'){
                    acc.push(value.split(';').filter(v => v != removable).join(';'))
                } else
                    if (value != removable) acc.push(value)
                return acc
            })
            return this
        }
        filterChange(search, replace) {
            this.filters.push((acc, value) => {
                //console.log(value)
                if (this.choice == 'multi'){
                    acc.push(value.split(';').map(v => v == search? replace: v).join(';'))
                } else
                    acc.push(value == search ? replace: value)
                return acc
            })
            return this
        }
        filterLessThan(value) {
            this.minVal = value
            return this
        }
        filterTop(arr) {
            this.filters.push( (acc,val) => {
                const top = val.split(';').sort((a, b) => arr.indexOf(a) - arr.indexOf(b)).slice(-1)
                acc.push(top)
                return acc
            })
            return this
        }
        sortBy(arr) {
            this.sort = (a,b) => arr.indexOf(a) - arr.indexOf(b)
            return this
        }
        sortByValue() {
            this.sort = 'value'
            return this
        }
        debug() {
            this.dbg = true
            return this
        }
        colorize(c) {
            this.color = c
            return this
        }
        out() {
            const order = (unordered) => {
                if (this.sort == 'value') {
                    return Object.keys(unordered).sort((a,b)=>unordered[b]-unordered[a]).reduce(
                        (obj, key) => {
                            obj[key] = unordered[key]; 
                            return obj;
                        }, {})
                } else {
                    return Object.keys(unordered).sort(this.sort).reduce(
                        (obj, key) => {
                            obj[key] = unordered[key]; 
                            return obj;
                        }, {})
                }
            }

            if (['single','multi'].includes(this.choice)) {
                let d = this.data[this.col]
                for (const filt of this.filters) d = d.reduce(filt, [])
                if (this.calculate == 'count') {
                    if (this.choice == 'multi') {
                        d = d.reduce((acc, val) => {
                            for (const v of val.split(';')) acc.push(v)
                            return acc
                        }, [])
                    }
                    const count = 
                        order(d.reduce((acc, val) => {
                            if (!acc[val]) acc[val] = 0
                            acc[val]++
                            return acc
                        }, {}))
    
                    const drop = this.minVal ? -Object.values(count).filter(x => x < this.minVal).length: count.length
                    if (this.dbg) Object.entries(count).forEach(x => console.log(x))
                    const labels = Object.keys(count).slice(0, drop)
                    const data = Object.values(count).slice(0, drop)
                    const n = labels.length
                    return {
                        labels,
                        datasets: [{
                            label: 'näytä',
                            data,
                            backgroundColor: this.color.colors(n),
                            hoverBackgroundColor: this.color.colors(n)
                        }]
                    }
                }
            }
            if (this.choice == 'group') {
                const labels = Object.keys(this.col)
                const colors = this.color.colors(this.groups.length)
                const datasets = []
                for (const g of this.groups) {
                    datasets.push({
                        label: g,
                        data: labels.map(grp => {
                            let d = this.data[this.col[grp]]
                            for (const filt of this.filters) d = d.reduce(filt, [])

                            d = d.reduce((acc, val) => {
                                for (const v of val.split(';')) acc.push(v)
                                return acc
                            }, [])
                            const count = d.reduce((acc, val) => {
                                if (!acc[val]) acc[val] = 0
                                acc[val]++
                                return acc
                            }, {})
                            return count[g]
                        }),
                        backgroundColor: colors[this.groups.indexOf(g)]
                    })
                }
                return {
                    labels,
                    datasets
                }
            }
        }
    }

	onMount(async () => {
        const data_ = await csv(base + "/jtr-data-2023.csv");
        const dataMap_ = {}
        data_.columns.forEach((col, idx)=>{
            dataMap_[col] = []
            Array.from(data_).forEach(row=>{
                dataMap_[col].push(row[col])
            })
        })
        //data = data_
        dataMap = dataMap_
        $: data = new Data(dataMap)
        console.log({ data, dataMap })

        calculate()
	});

    const calculate = () => {
        const d = dataMap['Ikä?']
        for (let i=2; i<10; i++)
            boxes.push(color.colors(i))
        $: boxes = boxes

        //pieChart(d, color.diverging())
    }


    const pieChart = (data, color) => {
        if (!data) return 'pie'
        return new PieChart(data, color)
    }
    const sum = (p) => {} 
</script>

<svelte:head>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/@typopro/web-bebas-neue@3.7.5/TypoPRO-BebasNeue.css">
  <link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet">
</svelte:head>

<div class="content">

<img class="logo" src="{base}/metso.png" alt="metso logo">
<h1>Jyväskylä Trail Runners kysely</h1>
<p>
Jyväskylä Trail Runners facebook-ryhmässä pyydettiin ihmisiä
vastaamaan ryhmän toimintaa ja ryhmäläisten liikkumista koskevaan kyselyyn vuodesta 2023.
Vastausten määrä oli 90 kpl (Aikaisemmat 
<a href="https://mudyc.github.io/jtr-stats-2021/">2022</a>:40 kpl, 
<a href="https://mudyc.github.io/jtr-stats-2021/">2021</a>: 48kpl, 
<a href="https://mudyc.github.io/jtr-stats-2019/">2019</a>: 63 kpl, 
<a href="https://mudyc.github.io/jtr-stats-2018/">2018</a>, 98 kpl)
ryhmäläisten kokonaismäärä oli 1392 kpl (tarkastettu 2.1.2024,
 2022: 1353 kpl,
 2021: 1299 kpl,
 2019: 1056 kpl,
 2018: 888 kpl).
</p>
<!--

{#each boxes as bb}
  <div>
    {#each bb as b}
      <div style="display: inline-block; width: 3em; height: 3em; background-color: {b}"></div>
    {/each}
  </div>
{/each}
-->



<h2>Kyselyn taustatiedot</h2>

<h3>Vastaajien kilpailusarja</h3>

{ data?.kpl('Sarja johon kirjaudun') } vastaajaa kertoi kyselyn alkutietoihin liittyvän kilpasarjan.

    <PieChart data={
        data?.singleChoice('Sarja johon kirjaudun')
        .filterEmpty()
        .count()
        .colorize(color.diverging())
        .out() }
    />


<h3>Vastaajien ikä</h3>

{ data?.kpl('Ikä?') } vastaajaa kertoi oman ikäryhmänsä. Pääosa juoksijoista on keski-iän molemmin puolin.

    <BarChart data={
        data?.singleChoice('Ikä?')
        .filterEmpty()
        .count()
        .colorize(color.diverging())
        .out() }
    />

<hr/>

<h2>Lähtötaso</h2>

<h3>Viimeisen vuoden aikana juostu (pisimmillään)</h3>

{ data?.kpl('Olen juossut viimeisen vuoden aikana') } vastasi kuinka pitkälle on pisimmillään juossut viimeisen vuoden aikana.

<BarChart data={
    data?.singleChoice('Olen juossut viimeisen vuoden aikana')
    .filterEmpty()
    .filterTop('1km lenkin,5km lenkin,10km lenkin,puolimaratonin,maratonin,ultran'.split(','))
    .sortBy('1km lenkin,5km lenkin,10km lenkin,puolimaratonin,maratonin,ultran'.split(','))
    .count()
    .colorize(color.diverging())
    .out() }
/>


<h3>Viimeisen vuoden aikana teen vähintään puolituntia kestävää liikuntaa</h3>

{ data?.kpl('Viimeisen vuoden aikana teen vähintään puolituntia kestävää liikuntaa') } 
vastaajaa kertoi kuinka usein on liikkunut viikottain viimeisen vuoden aikana.
Kerran päivässä treenaavat ovat se pääasiallinen joukko ja pienempi ryhmä treenaa kahdesti päivässä 💪

<HorizBarChart data={
    data?.singleChoice('Viimeisen vuoden aikana teen vähintään puolituntia kestävää liikuntaa')
    .filterEmpty()
    .count()
    .sortBy('noin kerran viikossa,yleensä kahdesti viikossa,kolmesti viikossa,neljästi viikossa,viidesti viikossa,kuudesti viikossa,seitsemästi viikossa,8 kertaa viikossa,9 kertaa viikossa,10 kertaa viikossa,11 kertaa viikossa,12 kertaa viikossa'.split(','))
    .colorize(color.diverging())
    .out() }
/>

<h3>Viimeisin Cooper tulokseni</h3>

{ data?.kpl('Viimeisin Cooper-tulokseni (valitse lähin)') } vastaajaa kertoi tämän vuoden Cooper-tuloksen.

<HorizBarChart data={
    data?.singleChoice('Viimeisin Cooper-tulokseni (valitse lähin)')
    .filterEmpty()
    .count()
    .colorize(color.diverging())
    .out() }
/>
<img alt="cooper vertailutaulukko" src="{base}/cooper.png" >

<h3>Treenitavat</h3>

{ data?.kpl('Olen treenannut') } 
vastasi treenitavoistaan. PK-lenkit ovat juoksun perusta, mutta eri treenimuodoilla haetaan tulosparannukset.

<HorizBarChart data={
    data?.multiChoice('Olen treenannut')
    .filterRemove('Uinti, pyöräily')
    .filterRemove('Hiihto')
    .filterRemove('Pyöräillyt juoksun edestä')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Treeniseura</h3>

{ data?.kpl('Useimmiten treenaan') } 
vastasi monenko seurassa useimmiten treenaa.
Juoksuhan on yksilölaji, mutta näköjään 
poikkeuksena pari ja ryhmäliikkujiakin alkaa löytyä 😁

<PieChart data={
    data?.singleChoice('Useimmiten treenaan')
    .filterEmpty()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Toimet kovan treenin ohessa</h3>

{ data?.kpl('Kovan treenin ohessa') } 
vastasi mitä tekee kovan treenin ohessa. 
Iloiten voi todeta kuinka hyvin ryhmäläiset huolehtivat kehostaan. 
<HorizBarChart data={
    data?.multiChoice('Kovan treenin ohessa')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<hr/>
<h2>Haaveet ja tavoitteet</h2>

<h3>Tavoitteenani on</h3>
{ data?.kpl('Tavoitteenani on') } 
vastasi tavoitteisiinsa.
Luonnosta nauttiminen säilyy jo viidettä kertaa ykkösenä.
Tänä vuonna lisättiin vaihtoehdoksi "löytää polulta elämäni rakkaus" 
ja näemmä 9 vastaajaa hempeää oman polkurakkauden äärelle ❤️ Rakkaus on kaunista 🥰
<HorizBarChart data={
    data?.multiChoice('Tavoitteenani on')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Haaveissani olisi</h3>
{ data?.kpl('Haaveissani olisi') } 
vastasi haaveistaan.

Polkujuoksu pohjoisessa Suomessa on tällä kertaa voittaja. Tähän on paljon hyviä vaihtoehtoja: 
NUTS Karhunkierros, NUTS Ylläs-Pallas, NUTS Pyhä, Kaldoaivi Ultra ensimmäiset muistista mainitakseni. 
Jos haluaa vähän extremempää, voi käydä juoksemassa <a href="https://hazor.iki.fi/kiilopaan_kierros/">Kiilopään kierroksen</a> kaverin kanssa.
<p>
Pidempi juoksuvaellus on mielenkiintoinen haave. Tähän ratkaisuksi on vaihtoehtoina esim. 
Petterin vetämä juoksuvaellus <a href="https://www.wildadventuresnorth.fi/juoksuvaellushaltille/">käsivarren erämaassa</a>,
Alppimentorien vetämät juoksuvaellukset alpeilla,
hyvän juoksuvaelluksen saa aikaan myös Bogostan kierros/Susi taival/Karhunpolku poluilla,
Pirkan taivalkin soveltuu juoksuvaeltamiseen,
Lappland Wildernes Challenge varauksella
sekä tietysti Peuran polku/Suurjärven reitistö.
Voihan sitä ottaa myös junan/bussin Jämsään ja tulla vanhaa Keskis-Suomen maakuntauraa kohti Jyväskylää yöpymisellä.
Koitetaanpa kartoittaa näitä kohteita lisää. Haaveistahan tulee tavoitteita kun ne laittaa kalenteriin!
<HorizBarChart data={
    data?.multiChoice('Haaveissani olisi')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Isoimmat esteet haaveilleni ovat kaiketi</h3>
{ data?.kpl('Isoimmat esteet haaveilleni ovat kaiketi') } 
vastasi esteistään. 
<HorizBarChart data={
    data?.multiChoice('Isoimmat esteet haaveilleni ovat kaiketi')
    .filterRemove('Saimaa Cycle tour 300 km')
    .filterEmpty()
    .filterChange('Henkinen kuormitustilanne', 'Terveyshaitta')
    .filterChange('Terveys (ollut ongelmia…)', 'Terveyshaitta')
    .filterChange('Alituiset vammat joiden hoitaminen ja kuntouttaminen on vaikeaa', 'Terveyshaitta')
    .filterChange('Astma joka hidastaa etenemistäni', 'Terveyshaitta')
    .filterChange('Pääfocus eri lajissa ja siihen menee koko budjetti', 'Määrärahojen puute')
    .filterChange('Ei ole autoa käytössä', 'Kulkuyhteydet')
    .filterChange('Vuorotyö ja epäsäännölliset vapaat rasittaa. ', 'Työ')
    .filterChange('ITRA pisteet tai UTMB-kivet', 'UTMB arvonta')
    .filterChange('(UTMB) kisa-arvonnat', 'UTMB arvonta')
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Uudet reitit</h3>
{ data?.kpl('Uusilla reiteillä seuraan') } 
vastasi miten uusilla reiteillä etenee. Aikanaan 
<HorizBarChart data={
    data?.multiChoice('Uusilla reiteillä seuraan')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>


<hr/>
<h2>Lähitreenit</h2>

<h3>Yhteislenkit</h3>
{ data?.kpl('Olen käynyt yhteislenkillä') } 
vastasi yhteislenkille osallistumisestaan. Pääosa on käynyt yhteislenkillä.
<PieChart data={
    data?.singleChoice('Olen käynyt yhteislenkillä')
    .filterEmpty()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Yhteislenkki koettiin</h3>
{ data?.kpl('Yhteislenkki oli (jos osallistuit)') } 
vastasi kokemuksestaan yhteislenkiltä. Olemme pääasiassa onnistuneet lenkittämisessämme.

<HorizBarChart data={
    data?.multiChoice('Yhteislenkki oli (jos osallistuit)')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Kätevät treenipaikat</h3>
{ data?.kpl('Minulle käteviä treenipaikkoja olisivat') } 
vastasi heille soveliaista treenipaikoista.
Viiden vuoden jälkeen Laajis kiipesi Halssilan ohi parhaana treenipaikkana!
<HorizBarChart data={
    data?.multiChoice('Minulle käteviä treenipaikkoja olisivat')
    .filterRemove('Ihan Samaa')
    .filterRemove('Ensi vuonna Jyväskylä ei toimi')
    .filterRemove('..mutta kiva olisi tutustua muuhunkin ympäristöön jos yhdysreitti ja näitä en tunne lainkaan..')
    .filterRemove('Kaikki, autolla pääsee kauemmas')
    .filterRemove('Siellä missä ei ole hirveästi ihmisiä heh')
    .filterRemove('HIMOS ESIM')
    .filterRemove('Asun Jämsänkoskella, mutta jos aikatauluihin osuu lenkki Muurame-Korpilahti suunnalla, osallistum')
    .filterRemove('Kaikki käy mutta nuo ovat lähimpiä')
    .filterRemove('Palokka: muut kohteet kuin Touruvuori')
    .filterRemove('Ihan samaa')
    .filterRemove('Paloheinä, Malminkartanon huippu')
    .filterRemove('Missä muuratsalo?')
    .filterEmpty()
    .filterChange('Keljo (Lähtö PV:n luolalta)', 'Myllyjärvi')
    .filterChange('Harju', 'Keskusta')
    .filterChange('Vihtavuori', 'Laukaa')
    .filterChange('Mustalampi, Hanhiperä', 'Mäyrämäki')
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Käyn treeneissä yleensä</h3>
{ data?.kpl('Käyn treeneissä yleensä') } 
vastasi liikkumistapaan treeneihin.
<HorizBarChart data={
    data?.multiChoice('Käyn treeneissä yleensä')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>


<h3>Paras ajoitus treenille</h3>
{ data?.kpl('Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Maanantai]') } 
vastasi treenien parhaaseen ajoitukseen eri päivinä.

<BarChart data={
    data?.groupChoice({
        Maanantai: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Maanantai]',
        Tiistai: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Tiistai]',
        Keskiviikko: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Keskiviikko]',
        Torstai: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Torstai]',
        Perjantai: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Perjantai]'
    })
    .grps('5-7,7-10,10-12,12-15,15-17,17-19,19-21,>21'.split(','))
    .filterEmpty()
    .count()
    .colorize(color.diverging())
    .out() }
/>
<BarChart data={
    data?.groupChoice({
        Lauantai: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Lauantai]',
        Sunnuntai: 'Paras ajoitus olisi (kellonaika) - [puhelin vaakatasoon] [Sunnuntai]'
    })
    .grps('5-7,7-10,10-12,12-15,15-17,17-19,19-21,>21'.split(','))
    .filterEmpty()
    .count()
    .colorize(color.diverging())
    .out() }
/>


<h3>Optimaalinen treeni</h3>
{ data?.kpl('Treenimääränä minusta olisi optimaalinen') } 
vastasi treenien kestoon.
<BarChart data={
    data?.multiChoice('Treenimääränä minusta olisi optimaalinen')
    .filterEmpty()
    .sortBy([
        '30 min',
        '45 min',
        '1 h',
        '1 h 30 min',
        '2 h',
        '2 h 30 min',
        'yli 3 h',
    ])
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Treenin tehokkuus tulisi olla</h3>
{ data?.kpl('Treenin tehokkuus tulisi olla mielestäni') } 
vastasi treenien tehokkuuteen.
<HorizBarChart data={
    data?.multiChoice('Treenin tehokkuus tulisi olla mielestäni')
    .filterRemove('Laajat treenit olisi jees, jos otetaan kaikki myös huomioon. Mahdollistettaisiin samassa porukassa pysyminen.')
    .filterRemove('Uusiin polkuihin tutustumista')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>


<h3>Treenimaaston tulisi sisältää</h3>
{ data?.kpl('Treenimaaston tulisi sisältää') } 
vastasi maasto-olosuhteisiin. Puolet haluaa paljon verttiä ja toinen puoli mahdollisimman vähän 🤔🤔
<HorizBarChart data={
    data?.multiChoice('Treenimaaston tulisi sisältää')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Treeneistä tulisi ilmoittaa</h3>
{ data?.kpl('Treeneistä tulisi ilmoittaa') } 
vastasi tarvittavista etukäteisjärjestelyistä. Ehkä paremmin voisimme jatkossa huomioida vuorotyöläiset/yksinhuoltajat, 
jotka mahdollisesti tarvitsevat aikaa järjestää kalenteria/pyytää vapaita.
<HorizBarChart data={
    data?.multiChoice('Treeneistä tulisi ilmoittaa')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Koronan vaikutus</h3>
{ data?.kpl('Korona on vaikuttanut') } 
vastasi.
<PieChart data={
    data?.singleChoice('Korona on vaikuttanut')
    .filterEmpty()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<hr/>
<h2>Parasta toiminnassa on ollut</h2>

{ data?.kpl('Parasta yhteistoimintaa on ollut') } 
vastasi mikä toiminnassa on ollut parasta. 
Yhteislenkit jatkaa kirkkaana ykkösenä ja edelleen juoksukaverit seuraavat mukavasti heti perässä.
<HorizBarChart data={
    data?.multiChoice('Parasta yhteistoimintaa on ollut')
    .filterRemove('JUOKSUVAELLUS OHJATTU SELLAINEN ')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>

<h3>Lisäksi haluaisin toimintaan lisättävän</h3>

{ data?.kpl('Lisäksi haluaisin') } 
vastasi mitä toiminnassa haluaisi lisää. Yhteislenkit ja pitkikset vetoavat.
<HorizBarChart data={
    data?.multiChoice('Lisäksi haluaisin')
    .filterRemove('EOS')
    .filterChange('Yhteinen etelän juoksuleiri talvella 2024-25 esimerkiksi Kanarialla, jos joku tuntee hyvin reittejä.',
        'Juoksuleiri Kanarialla talvella 2024-25')
    .filterChange('Yhteinen kisamatka ulkomaille (sitten kun on taas opiskelujen jälkeen määrärahoja)',
        'Yhteinen kisamatka ulkomaille')
    .filterChange('Yhteislenkkejä mallia "verkkainen". Itselläni on niin, että pystyn hyvin suoriutumaan 16-20 km lenkeistäkin ja olen niitä tehnyt omatoimisesti, mutta en tykkää kiirehtiä, kun hyviä luontokohteita näen. Olen tehnyt pitkiä määriä vuoden aikana kilometreinä, mutta vauhti ollut maltillinen.',
        'Verkkaiset yhteislenkit')
    .filterEmpty()
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>



<hr/>
<h2>Muut harrastukset</h2>

{ data?.kpl('Harrastan myös') } 
vastasi muita harrastuksia koskevaan kyselyyn. Yksittäisiä tai muutamia vastauksia tuli myös seuraavia:
<ul>
<li>Agility</li>
<li>Crossfit</li>
<li>Frisbeegolf</li>
<li>Golf</li>
<li>Hiihtovaellus</li>
<li>Jooga</li>
<li>Juoksu</li>
<li>Jääkiekko</li>
<li>Jääpallo</li>
<li>Kaukalopallo</li>
<li>Koripallo</li>
<li>Liukulumikenkäily</li>
<li>Lumilautailu</li>
<li>Neulominen</li>
<li>Pesäpallo</li>
<li>Potkukelkkailu</li>
<li>Pyöräily</li>
<li>Ratsastus</li>
<li>Ringette</li>
<li>Rullahiihto</li>
<li>Rullaluistelu</li>
<li>Sauvakävely</li>
<li>Umpihankihiihto</li>
<li>Vaellus</li>
<li>Valjakkourheilu</li>
<li>Varjoliito</li>
<li>Vetokoiraurheilu</li>
<li>Voimistelu</li></ul>
<HorizBarChart data={
    data?.multiChoice('Harrastan myös')
    .filterChange('Kuntosali, crossfit', 'Kuntosali;Crossfit')
    .filterChange('Vaellus, hiihtovaellus','Vaellus;Hiihtovaellus')
    .filterChange('Rullahiihto/luistelu, sali, koripallo', 'Rullahiihto;Rullaluistelu;Sali;Koripallo')
    .filterChange('Puntti, pesäpallo (osa yllä mainituista ei kovin aktiivisia mutta teen jos tilaisuus tulee)','Sali;Pesäpallo')
    .filterChange('Agility ja tehokas neulominen. 😂','Agility;Neulominen')
    .filterChange('Voimaharjoittelu', 'Sali')
    .filterChange('Kuntosali, astangajooga', 'Sali;Jooga')
    .filterChange('jooga, retkeily ja vaellukset','Jooga;Retkeily;Vaellus')
    .filterChange('jooga', 'Jooga')
    .filterChange('Lihaskuntotreeni salilla ja muuten', 'Sali')
    .filterChange('Kuntosali ', 'Sali')
    .filterChange('Sali', 'Kuntosali')
    .filterEmpty()
    .filterLessThan(5)
    .sortByValue()
    .count()
    .colorize(color.diverging())
    .out() }
/>




</div>

  <style>
    :global(body) {
        font-family: 'Montserrat', sans-serif;
    }
    img {
      display: block;
      margin: 0 auto;
    }
    img.logo {
      width: 200px;
    }
    h1,h2,h3,h4 {
      text-align: center;
      font-family: 'TypoPRO Bebas Neue';
    }
    h3 {
      font-size: 1.3em;
    }
    .content {
      max-width: 950px;
      margin: 0 auto;
    }
    hr {
      margin: 5em;
      border-width: 2px;
      border-color: #3a8887;
    }
  </style>