window.$ = window.jquery = require("jquery");
var cheerio = require('cheerio');
var request = require('request');
var ipcRenderer = require('electron').ipcRenderer;

var companiesWanted = [];
var $search = $('#search');
var $error = $('.error');
var $itemToRemove = $('.item-to-remove');
var isRunning;


$search.keyup(function (e) {
    var item = $(this).val();
    var $active = $('.active');
    if (e.keyCode == 13) {
        if ($active.length > 0) {
            item = $active.attr('data-symbol');
        }
        companiesWanted = $.grep(companiesWanted, function (value) {
            if (value == item) {
                $error.text("We're already getting data for this stock").fadeIn(500);
                setTimeout(500);
                $error.fadeOut(2000);
            }
            return value != item;
        });
        if ($.inArray(item, companiesWanted)) {
            companiesWanted.push(item);
        }
        $('.search-results').hide();
        $(this).val('');
        if (!isRunning) {
            getSingleStock(item);
        }
    } else if (e.keyCode == 40) {
        if ($active.length == 0) {
            $('.search-results p:first-child').addClass('active');
        } else {
            $active.removeClass('active').next('p').addClass('active');
        }
    } else if (e.keyCode == 38) {
        if ($active.length == 0) {
            $('.search-results p:last-child').addClass('active');
        } else {
            $active.removeClass('active').prev('p').addClass('active');
        }
    } else {
        getList(item);
    }
});

$('#blah').click(function () {
    console.log(getList());
});

function removeValues($itemToRemove) {
    companiesWanted = $.grep(companiesWanted, function (value) {
        return value != $itemToRemove.text();
    });
    $error.text('The value you entered does not exist: ' + $itemToRemove.text());
    $error.fadeIn(500);
    setTimeout(500);
    $error.fadeOut(2000);
    $itemToRemove.text('');
}

function getList(input) {
    var url = 'http://d.yimg.com/aq/autoc?query=';
    url += input;
    url += '&region=US&lang=en-US';
    request(url, {timeout: 1500}, function (err, resp, body) {
        if (!err) {
            body = JSON.parse(body);
            var formattedData = body['ResultSet']['Result'];
            displayQuery(formattedData);
        }
    });
}

function displayQuery(query) {
    var $searchResults = $('.search-results');
    var offset = $search.offset();
    $searchResults.empty();
    query.forEach(function (data) {
        $searchResults.append("<p data-symbol='" + data['symbol'] + "'>" + data['name'] + "</p>");
    });
    $searchResults.css({
        background: "white",
        border: "1px solid #ddd",
        display: "block",
        left: offset.left,
        top: offset.top + $search.outerHeight(),
    })
}

function getMultipleStocks(input) {
    for (var i = 0; i < input.length; i++) {
        if (!$itemToRemove.is(':empty')) {
            removeValues($itemToRemove);
        }
        var url = "http://query.yahooapis.com/v1/public/yql?q=env 'store://datatables.org/alltableswithkeys';select * from yahoo.finance.quotes where symbol in (";
        url += '"' + input[i] + '")&format=json';
        request(url, {timeout: 1500}, function (err, resp, body) {
            var $error = $error;
            if (!err) {
                if (resp['statusMessage'] !== 'Bad Request') {
                    body = JSON.parse(body);
                    body = body['query']['results']['quote'];
                    newPrice(body);
                } else {
                    var itemToRemove = resp['request']['path'].replace('/finance/info?client=ig&q=', '');
                    $itemToRemove.text(itemToRemove);
                }
            } else if (err.code === 'ETIMEDOUT') {
                $error.css({display: 'block'});
                $error.text('Your request has timed-out, is google up?');
            } else {
                $error.css({display: 'block'});
                $error.text('Sorry, There was an error with the request. Try again or contact the developer');
            }
        });
    }
    isRunning = false;
}
function getSingleStock(input) {
    var url = "http://query.yahooapis.com/v1/public/yql?q=env 'store://datatables.org/alltableswithkeys';select * from yahoo.finance.quotes where symbol in (";
    url += '"' + input + '")&format=json';
    request(url, {timeout: 1500}, function (err, resp, body) {
        var $error = $error;
        if (!err) {
            if (resp['statusMessage'] !== 'Bad Request') {
                body = JSON.parse(body);
                body = body['query']['results']['quote'];
                newPrice(body);
            } else {
                var itemToRemove = resp['request']['path'].replace('/finance/info?client=ig&q=', '');
                $itemToRemove.text(itemToRemove);
            }
        } else if (err.code === 'ETIMEDOUT') {
            $error.css({display: 'block'});
            $error.text('Your request has timed-out, is google up?');
        } else {
            $error.css({display: 'block'});
            $error.text('Sorry, There was an error with the request. Try again or contact the developer');
        }
    });
}

var lastprice = [];
var lastItem = false;

function EncodeEntities(rawStr) {
    var encodedStr = rawStr.replace(/[\u00A0-\u9999<>.^\&]/gim, function (i) {
        return i.charCodeAt(0);
    });

    return encodedStr;
}

function newPrice(arr) {

    var $lastElement = $('.wrapper');
    var currentPrice = arr['LastTradePriceOnly'],
        companyName = arr['Name'],
        companyId = EncodeEntities(arr['symbol']) + EncodeEntities(arr['StockExchange']),
        $history = $('#priceHistory' + companyId),
        $company = $('#company' + companyId),
        wrap = document.createElement('span'),
        newElText,
        textNode;

    if ($('#' + companyId).length === 0) {
        if (lastItem) {
            lastItem = false;
            $lastElement.append('<div class="stocks" id="' + companyId + '"><h3 class="company-title-alt" id="company' + companyId + '"></h3><div class="the-price" id="price' + companyId + '"></div><div class="up-down" id="priceHistory' + companyId + '">-</div></div>');
        } else {
            lastItem = true;
            $lastElement.append('<div class="stocks" id="' + companyId + '"><h3 class="company-title" id="company' + companyId + '"></h3><div class="the-price" id="price' + companyId + '"></div><div class="up-down" id="priceHistory' + companyId + '">-</div></div>');
        }

        if (lastprice[companyId] < currentPrice) {
            newElText = "&#x25B2;";
            wrap.className = "up";

        } else if (lastprice[companyId] > currentPrice) {
            newElText = "&#x25BC";
            wrap.className = "down";
        } else {
            newElText = "-";
            wrap.className = "no-change";
        }

        $history.append(wrap);
        textNode = document.createTextNode(newElText);
        $history.html(textNode);

        document.getElementById('price' + companyId).innerHTML = currentPrice;
        document.getElementById('company' + companyId).innerHTML = companyName;
        lastprice[companyId] = currentPrice;
    } else {
        if (lastprice[companyId] < currentPrice) {
            newElText = "▲";
            wrap.className = "up";

        } else if (lastprice[companyId] > currentPrice) {
            newElText = "▼";
            wrap.className = "down";
        } else {
            newElText = "-";
            wrap.className = "no-change";
        }

        if ($company.is(':empty')) {
            $company.text(companyName);
        }

        $history.append(wrap);

        textNode = document.createTextNode(newElText);

        $history.html(textNode);

        document.getElementById('price' + companyId).innerHTML = currentPrice;
        lastprice[companyId] = currentPrice;
    }
}
setInterval(function () {
    if (companiesWanted.length > 0) {
        isRunning = true;
        getMultipleStocks(companiesWanted);
    }
}, 6000);

$('#minimize').click(function () {
    ipcRenderer.send('minimize');
});
$('#maximize').click(function () {
    ipcRenderer.send('maximize');
});
$('#close').click(function () {
    ipcRenderer.send('close');
});
