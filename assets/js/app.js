var pageNo = 1;
var pageCount;
var events = [];


//Dynamically add filter categories to Filter Dropdown.
$("#filter").empty();
for (x in categories) {
    var newOpt = $("<option>");
    newOpt.val(x)
        .text(categories[x])
    $("#filter").append(newOpt);
}

//On Selection of Filters, hide all rows, then only show rows containing the selected categories.
$("#filter").on("change", function () {
    var categoryFilters = $(this).val();
    if (categoryFilters.length === 0) {
        $("#events").find("tr").show();
        return false;
    } else {
        $("#events").find("tr").hide();
        for (x in categoryFilters) {
            $("#events").find(`tr[data-category='${categoryFilters[x]}']`).show();
        }
    }
});

// api call function 
function eventbriteAPI(destination, startDate, endDate) {
    startDate = moment(startDate).format("YYYY-MM-DDThh:mm:ss");
    endDate = moment(endDate).format("YYYY-MM-DDThh:mm:ss");

    var queryURL = `https://cors-anywhere.herokuapp.com/https://www.eventbriteapi.com/v3/events/search?start_date.range_start=${startDate}&start_date.range_end=${endDate}&location.address=${destination}&page=${pageNo}`;

    $.ajax({
        url: queryURL,
        method: "GET",
        beforeSend: function (request) {
            request.withCredentials = true;
            request.setRequestHeader("Authorization", "Bearer QPEWGCGG3AMHB3TDR5S2");
        },
    }).then(function (response) {

        if (response.events.length === 0) {
            $('#modalEvents').modal('open');
            $("#moreEvents").hide();
        }
        for (i = 0; i < response.events.length; i++) {
            events.push(response.events[i]);
        }
        buildTable(events);
        events = [];
    });
}

function buildTable(events) {
    for (x in events) { //For each element in events array.
        var data = events[x]; //Set data to current element interval.
        var newTR = $(`<tr data-category='${data.category_id}'>`);
        newTR.append(`<td>${data.name.text}</td>`)
            .append(`<td >${(data.category_id === null) ? 'None' : categories[data.category_id]}`)
            .append(`<td>${moment(data.start.local).format("MM/DD/YYYY h:mm a")}</td>`) //Formats date/time
            .append(`<td>${data.is_free ? 'Free!' : 'Not Free!'}</td>`) //Terniary operator, outputs based on is_free boolean.
            .append(`<td><a href='${data.url}' target="_blank">More Info</a>`); //URL to the eventbrite page.
        $("#events").append(newTR);
    }
    $("#filter").trigger("change");
    $("#eventsTable").trigger("update");
    $(".loadingBar").hide();
}

$("#moreEvents").click(function () {
    $(".loadingBar").show();
    pageNo++;
    var location = $("#destination-input").val().trim();
    var startDate = $("#start-date").val().trim();
    var endDate = $("#end-date").val().trim();
    eventbriteAPI(location, startDate, endDate);

})

//Flight API function that will take locations and departure date as input.
function skyscannerAPI(from, to, date) {
    $(".loadingBar1").show();
    var date1 = moment(date).format("YYYY-MM-DD");         //change date format to be used in flight API
    var dateFormat = moment(date).format("MMM DD, YYYY"); //change Date format to display on webpage
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/US/USD/en-US/" + from + "-sky/" + to + "-sky/" + date1,
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
            "x-rapidapi-key": "15873b5e23mshf948e6e3feda7b2p1db4fajsn89e6f75dccf9"
        }
    }

    $.ajax(settings).done(function (response) {
        console.log(response);
        if (response.Quotes.length === 0) {
            var row2 = `
            <tr>
            <td>${"No Flights Available From " + from + " To " + to}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            </tr>
            `
            $(".flight").append(row2);
            $(".loadingBar1").hide();
        }
        else {
            for (i = 0; i < response.Carriers.length; i++) {
                if (response.Quotes[0].OutboundLeg.CarrierIds[0] == response.Carriers[i].CarrierId) {
                    var row2 = `
                <tr>
                <td>${from}</td>
                <td>${to}</td>
                <td>${response.Carriers[i].Name}</td>
                <td>${dateFormat}</td>
                <td>${"$" + response.Quotes[0].MinPrice}</td>
                </tr>
                `
                    $(".flight").append(row2); //appends flight available to the table.
                    $(".loadingBar1").hide(); //hides the loading bar after search complete

                }

            }
        }
    }).then(function(){
        $("#flight-table").trigger("update"); // sort table by flight departure date
    });

}

$(document).ready(function () {

    $("#submit").on("click", function (event) {
        event.preventDefault();
        $("#events").empty(); //Empty the Events table.
        pageNo = 1
        var destination = $("#destination-input").val().trim();
        var origin = $("#origin-input").val().trim();
        var startDate = $("#start-date").val().trim();
        var endDate = $("#end-date").val().trim();
        $(".flight").empty();

        if (origin === "" || destination === "" || startDate === "" || endDate === "") {
            $('#modalEmpty').modal('open');
            $(".modalAccept").focus();
            return false;
        }

        if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
            $('#modalDate').modal('open');
            $(".modalAccept").focus();
            return false;
        };

        if (!cityToAirport[origin] || !cityToAirport[destination]) {
            $("#modalCity").modal('open');
            $(".modalAccept").focus();
            return false;
        };

        $(".loadingBar").show();
        eventbriteAPI(destination, startDate, endDate);
        $("#moreEvents").show();
        skyscannerAPI(cityToAirport[origin], cityToAirport[destination], startDate); //calling flight API for orgin to destination flight.
        skyscannerAPI(cityToAirport[destination], cityToAirport[origin], endDate);   //calling flight API for return flight from destination to origin.
    });

});

$(document).ready(function () {

    $(".loadingBar").hide();
    $(".loadingBar1").hide();
    $("#moreEvents").hide();
    $('select').formSelect();
    $('.datepicker').datepicker();
    $('.modal').modal();
    $('input.autocomplete').autocomplete({
        data: function () {
            var autoComplete = {};
            for (x in cityToAirport) {
                autoComplete[x] = null;
            }
            return autoComplete;
        }()
    });

    $("#eventsTable").tablesorter();
    $("#flight-table").tablesorter({ sortList: [[3, 0]] }); // allows the flights to be sorted by departure date.
});