const readAudioStream = (response, contentLength, params) => {
  const total = parseInt(contentLength, 10)
  let loaded = 0
  const startedStream = new Date()
  const that = this

  const stream = new ReadableStream({
    start(controller) {
      const reader = response.body.getReader()
      const read = () => {
        reader.read().then(({ done, value }) => {

          if (!params.all) {
            if (params.amount) {
              if (params.amount < total && loaded >= params.amount) {
                console.log(`Worker: Close stream frag - amount`)
                reader.releaseLock()
                controller.close()
                return
              } else if (loaded >= (65536 * 5)) { // 327.680
                console.log(`Worker: Close stream frag - amount`)
                reader.releaseLock()
                controller.close()
                return
              }
            } else {
              if (((new Date() - startedStream) / 1000) >= (params.sec || 5)) {
                console.log(`Worker: Close stream frag - time`)
                reader.releaseLock()
                controller.close()
                return
              }
            }
          }
          if (done) {
            console.log(`Worker: Close stream done`)
            // that.setState({ playingFullMusic: true })
            reader.releaseLock()
            controller.close()
            return
          }

          loaded += value.byteLength
          console.log('Worker: ', { loaded, total, percent: `${((loaded * 100) / total).toFixed(2)}%` }, (new Date() - startedStream) / 1000)
          controller.enqueue(value)

          read()
        }).catch(error => {
          console.error(error)
          controller.error(error)
        })
      }

      read()
    }
  })

  return stream
}

const fetchSong = (url) => {
  fetch(url).then(response => {
    if (!response.ok) {
      throw Error(`${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw Error('ReadableStream not yet supported in this browser.')
    }

    const contentLength = response.headers.get('content-length')
    if (!contentLength) {
      throw Error('Content-Length response header unavailable')
    }

    const stream = readAudioStream(response, contentLength, { all: true, sec: 3, amount: 1245184 })
    return new Response(stream)
  })
  .then(response => {
    return response.arrayBuffer()
  })
  .then(response => {
    console.log('Worker: ', response)

    postMessage({ text: 'worker response ', response})
  })
}

onmessage = function(event) {
  const { type, data } = event.data
  console.log('worker data:', { type, data })
  let response = null

  switch (type) {
    case 'audio':
        response = data

        fetchSong(data.url)
      break

    default:
      break
  }
}