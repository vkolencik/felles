const cheerio = require('cheerio');

String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function processClassPanel(panel, $) {
    // let classTitle = $('div.panel-heading *:not(:has("*"))', panel).text().get()[0]; // subelements without children
    let classTitle = $('div.panel-heading', panel).text(); // subelements without children
    //+ NTD2 (Nutriční terapeut, denní forma, 2. ročník)
    let titleComponents = classTitle.match(/\+\s*(\S+)\s*\(([^,]+)\s*,\s*([^,]+)\s*,\s*(\d+)\.\s*ročník\)/);
    return {
        classCode: titleComponents[1],
        classBranch: titleComponents[2],
        classEducationType: titleComponents[3] == 'denní forma' ? 'D' : 'K',
        classYear: parseInt(titleComponents[4]),
        classDataHash: $('table tbody', panel).html().hashCode()
    }
}

module.exports = {parseClassesHtml: function(html) {
    const $ = cheerio.load(html);
    let classPanels = $('div.news-body div.panel');
    return classPanels.map((i, panel) => processClassPanel(panel, $)).get();
}};
