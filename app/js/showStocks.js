window.$ = window.jquery = require("jquery");
var cheerio = require('cheerio');
var request = require('request');
var ipcRenderer = require('electron').ipcRenderer;

var companiesWanted = [];
var $search = $('#search');
var $error = $('.error');
var $itemToRemove = $('.item-to-remove');

$search.keypress(function (e) {
    // $('.row').empty();
    var item = $(this).val() + String.fromCharCode(e.which);
    // console.log(item);
    // var arr = $.grep(searchIndex, function (n) {
    //
    //     return ( n.toLowerCase().indexOf(item.toLowerCase()) >= 0)
    // });
    //
    // if ($('.suggestions').length === 0) {
    //     $('.search-wrapper').after('<div class="suggestions"></div>');
    // }
    // $.each(arr, function (index, value) {
    //     $('.suggestions').append('<div class="row">' + value + '</div>')
    // });
    //
    // var searchTop = $search.offset().top + $search.outerHeight(),
    //     searchLeft = $search.offset().left;
    // console.log(searchTop);
    // $('.suggestions').css({
    //     top: searchTop,
    //     left: searchLeft
    // });

    if (e.keyCode == 13) {
        item = $(this).val();
        if ($.inArray(item, companiesWanted)) {
            companiesWanted.push(item);
        } else {
            $error.text("We're already getting data for this stock").fadeIn(500);
            setTimeout(500);
            $error.fadeOut(2000);
        }
        $(this).val('');
    }
});

/**
 * @param $itemToRemove
 */
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
/**
 * @param companiesWanted
 */
function getData(companiesWanted) {
    for (var i = 0; i < companiesWanted.length; i++) {
        if (!$itemToRemove.is(':empty')) {
            removeValues($itemToRemove);
        }
        var baseUrl = 'https://finance.google.com/finance/info?client=ig&q=';
        var url = baseUrl + companiesWanted[i];
        request(url, {timeout: 1500}, function (err, resp, body) {
            var $error = $error;
            if (!err) {
                if (resp['statusMessage'] !== 'Bad Request') {
                    body = body.slice(3);
                    body = JSON.parse(body);
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
        setTimeout(1000);
    }
}

var lastprice = [];
var lastItem = false;
function newPrice(arr) {

    var $lastElement = $('.wrapper');
    var currentPrice = arr[0]["l"],
        companyName = arr[0]["e"] + ':' + arr[0]["t"],
        companyId = arr[0]["id"],
        $history = $('#priceHistory' + companyId),
        $company = $('#company' + companyId),
        wrap = document.createElement('span'),
        newElText,
        textNode;

    if ($('#' + companyId).length === 0) {

        if (lastItem) {
            lastItem = false;
            $lastElement.append('<div class="stocks" id="' + companyId + '"><h3 class="company-title-alt" id="company' + companyId + '"></h3><div class="the-price" id="price' + companyId + '"></div><div class="up-down" id="priceHistory' + companyId + '"></div></div>');
        } else {
            lastItem = true;
            $lastElement.append('<div class="stocks" id="' + companyId + '"><h3 class="company-title" id="company' + companyId + '"></h3><div class="the-price" id="price' + companyId + '"></div><div class="up-down" id="priceHistory' + companyId + '"></div></div>');
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
        getData(companiesWanted);
    }
}, 10000);

$('#minimize').click(function () {
    ipcRenderer.send('minimize');
});
$('#maximize').click(function () {
    ipcRenderer.send('maximize');
});
$('#close').click(function () {
    ipcRenderer.send('close');
});
