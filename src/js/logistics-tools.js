let ciMain = (data) => {
  $.getJSON('/consignments/', data).done((json) => {
    let output = $('<div>', {id: 'ci_results'})
    if (json.length > 0) {
      let head = $('<div>', { class: 'ci-row ci-head' })
      $.each(Object.keys(json[0]), (_i, k) => head.append($('<div>').text(k)))
      output.append(head)
      $.each(json, (_i, o ) => {
        let row = $('<div>', { class: 'ci-row' })
        $.each(o, (k, v) => $('<div>', {class: 'ci-' + k}).text(v).appendTo(row))
        output.append(row)
      })
    } else {
      output = $('<div>', { class: 'sc-row lt-error' }).html('<span>Query returned no results</span>')
    }
    $('#lt_results').html(output)
  })
  .fail((o, s, e) => {
    console.error('Ooops, CI GET Error: ' + s + '\n' + e)
    $('#lt_results').html($('<pre>').text(o))
  })
}

let acMain = (data) => {
  let containers = []
  var current
  $.each(data, (_i, bc) => {
    if (bc.match(/^PCS[0-9]{9}$/) === null) {
      let t = (bc.match(/^CSLC[0-9]{8}$/)) ? 'location' : 'trunk'
      containers.push({id: bc, type: t, records: []})
      current = bc
    } else {
      let idx = containers.findIndex(e => e.id === current)
      containers[idx].records.push(bc)
    }
  })
  if (containers.length === 0) {
    $('#lt_results').html($('<div>', { class: 'lt-error' }).text('Unable to build list of containers'))
  } else {
    $('#lt_results').html($('<div>', { id: 'ac_results' }))
    $.each(containers, (_i, o) => {
      let row = $('<div>', { id: o.id, class: 'ac-row' })
        .append($('<div>', { class: 'ac-col-l' }).text(o.id))
        .append($('<div>', { class: 'ac-col-r' })
          .append($('<ul>', { class: 'ac-list' })
            .append($('<li>', { class: 'ac-summary' }))))

      $('#ac_results').append(row)

      let errors = 0
      let added = 0
      $.each(o.records, (_i, r) => {
        let jqxhr = $.post('/'+ o.type + 'containers/' + o.id + '/scan/' + r)
        jqxhr.always(() => {

          if (jqxhr.status !== 204) {
            $('#'+ o.id +' ul.ac-list').append($('<li>', { class: 'sc-error' }).text(r + ' - ' + jqxhr.responseJSON.message))
            let audio = new Audio('/audio/wrongContainer.mp3')
	    audio.play()
            errors++
          } else {
            let audio = new Audio('/audio/success.mp3')
            audio.play()
            added++
          }
          $('#'+ o.id +' li.ac-summary').text('Records Added: ' + added + ', Errors: '+ errors)
        })
      })
    })
  }
}

let scMain = (source, dest) => {
  let data = { count: 5000, fields: 'tracking_number', q: 'trunk_container:' + source }
  $.getJSON('/consignments/', data)
  .done((cons) => {
    if (cons.length === 0) {
      $('#lt_results').html($('<div>', { class: 'lt-error' }).text('No records returned for ' + source))
    } else {
      $('#lt_results').html($('<div>', { id: 'sc_results' }))
      $.each(cons, (_i, c) => {
        let jqxhr = $.post('/trunkcontainers/' + dest + '/scan/' + c.tracking_number)
        jqxhr.always(() => {
          let row = $('<div>', { class: 'sc-row' })
          row.append($('<div>', { class: 'sc-col-l' }).text(c.tracking_number))
          let mesg = 'Record moved to ' + dest
          let cell = $('<div>', { class: 'sc-col-r' })
          if (jqxhr.status !== 204) {
            mesg = jqxhr.status + ': Error adding record to ' + dest
            cell.addClass('sc-error')
          }
          cell.text(mesg)
          row.append(cell)
          $('#sc_results').append(row)
        })
      })
    }
  })
}

let addPartsToDOM = () => {
  let lt = 'https://dvere.github.io/logistics-tools/'

  $('<link>', {
    id: 'lt-style',
    rel: 'stylesheet',
    href: lt + 'css/logistics-tools.css?v=' + $.now()
  })
  .appendTo($('head'))

  let ciFields = [
    'tracking_number',
    'requested_route',
    'consolidation_id',
    'location',
    'delivery_address_type',
    'package_type',
    'status'
  ]
  let ciData = {
    q: 'collected:SW',
    count: 1000,
    client_id: 11270,
    fields: ciFields.join(),
    location: 'SWINDON'
  }
  let ciOpts = [ 'RECEIVED SC', 'COLLECTED', 'ROUTED', 'RECONCILED' ]
  let scRegex = '(CSTC|OOC)[0-9]{8}'
  let scValid = { required: 'required',  pattern: scRegex }

  let ltMenu = $('<div>', { id: 'lt_menu' })
  .append($('<button>', { id: 'lt_ci', class: 'lt-button', text: 'Consignments Inspector' }))
  .append($('<button>', { id: 'lt_ac', class: 'lt-button', text: 'Auto Containers' }))
  .append($('<button>', { id: 'lt_sc', class: 'lt-button', text: 'Swap Containers' }))

  let ciForm = $('<div>', { id: 'ci_tab', class: 'lt-tab' })
  .append($('<div>', { id: 'ci_form' })
    .append($('<input>', { id:'ci_date', type:'date' }))
    .append($('<select>', { id: 'ci_status' }))
    .append($('<button>', { id: 'ci_btn', class: 'lt-button', text: 'Look up collections' })))

  let acForm = $('<div>', { id: 'ac_tab', class: 'lt-tab' })
  .append($('<div>', { id: 'ac_form' })
    .append($('<textarea>', { id:'ac_data' }))
    .append($('<button>', { id: 'ac_btn', class: 'lt-button', text: 'Process' }))
    .append($('<button>', { id: 'ac_clr', class: 'lt-button', text: 'Clear' })))

  let scForm = $('<div>', { id: 'sc_tab', class: 'lt-tab' })
  .append($('<div>', { id: 'ci_form' })
    .append($('<input>', { id: 'sc_old', class: 'lt-button lt-advance' }).attr(scValid))
    .append($('<input>', { id: 'sc_new', class: 'lt-button lt-advance' }).attr(scValid))
    .append($('<button>', { id: 'sc_btn', class: 'lt-button lt-advance' }).text('Move Records')))

  let ltContainer = $('<div>', { id: 'lt_container' })
    .append(ltMenu)
    .append($('<div>', { id: 'lt_insert' })
      .append(ciForm)
      .append(acForm)
      .append(scForm))
    .append($('<div>', { id: 'lt_results' }))

  $('div.breadcrumbs').hide()
  $('div.page-content > div > div')
  .empty()
  .append(ltContainer)

  $.each(ciOpts, (_i, v) => $('<option>', { value: v, text: v }).appendTo($('#ci_status')))

  $('#ci_btn').click(() => {
    ciData.received_at = $('#ci_date').val()
    ciData.status = $('#ci_status').val()
    ciMain(ciData)
  })

  $('#ac_btn').click(() => acMain($('#ac_data').val().toUpperCase().trim().split('\n')))
  $('#ac_clr').click(() => $('#ac_data').val(''))

  $('#sc_btn').click(() => {
    let source = $('#sc_old').val().trim()
    let dest = $('#sc_new').val().trim()
    scMain(source, dest)
  })

  $('#lt_ci').click(() => {
    $('.lt-tab').hide()
    $('#ci_tab').show()
  })
  $('#lt_ac').click(() => {
    $('.lt-tab').hide()
    $('#ac_tab').show()
  })
  $('#lt_sc').click(() => {
    $('.lt-tab').hide()
    $('#sc_tab').show()
    $('#sc_old').focus()
  })
}

$.when($.ready).then(function() {
  addPartsToDOM();
})
