/*
 * 가맹점 테라 계정에 남은 정산 금액을 전송
 */
import * as Bluebird from 'bluebird'
import * as ProgressBar from 'progress'
import axios from 'axios'
import * as config from 'config'

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

const merchants = [
  [ 'm:92b821b0-9f6c-4816-b271-6f9c7007beeb', '139242888', '야놀자(무한쿠폰룸)' ],
  [ 'm:5aea1073-91af-499f-bbf3-5585ec47021b', '7184516498', '야놀자(바로예약)' ],
  [ 'm:8ae2eddb-2dc6-4783-ac81-c3334b94714a', '10815811', '개발용 티몬' ],
  [ 'm:af3df620-e1f0-40c5-b0ca-6eb8d862d785', '5396939458', '티몬' ],
  [ 'm:f7344598-7bd3-4f21-a4a8-fb0a3ccee2f3', '98273582', '투어비스(타이드스퀘어)' ],
  [ 'm:6bfe11f5-23ac-4028-a9f0-e1f5ba02f0ff', '4163', '테스트 상점' ],
  [ 'm:3406c02e-59e2-46cc-9cc7-39c1d3e24c7b', '2377760', '벅스' ],
  [ 'm:fdfa28c8-4a58-4fd9-a070-83427f31ca94', '318739298', '번개장터' ],
  [ 'm:6e97f61b-f2b4-49c9-bff2-3d3306c014e0', '232105357', '아이디어스' ],
  [ 'm:a1b6a7f7-1677-49c3-b220-9f259b5ff0d6', '1099899717', '데일리호텔' ],
  [ 'm:9e363756-04d2-43d3-aed7-6026b4558b09', '398313864', '야놀자(국내레저)' ],
  [ 'm:7b60e351-1e1a-4561-824c-0c2d4fbbcb31', '172036814', '신상마켓' ],
  [ 'm:3c97e2c7-d631-4cff-ba4d-3810a58b1d07', '99505276', '에이블씨엔씨' ],
  [ 'm:d048cc5c-7698-4779-9bae-601fc8009eac', '508290400', '필웨이' ],
  [ 'm:fe7255e9-4469-46b3-befa-5714bceac20a', '73515481', '마리오아울렛' ],
  [ 'm:dc342888-fc79-4c01-bf8b-40a9b8a088ec', '720136652', '오늘의집' ],
  [ 'm:27616b2a-cd60-4180-9578-4f5be1577230', '117677797', '야놀자(해외숙박)' ],
]

async function main() {
  console.log(`Total ${merchants.length} merchants`)
  const bar2 = new ProgressBar('[:bar] :percent :rate/sec', { width: 50, total: merchants.length })

  await Bluebird.mapSeries(merchants, async merchant => {
    await axios.post(`http://localhost:${config.port}/claim/don`, {
      from: 'lp',
      to: merchant[0],
      amount: merchant[1]
    })

    bar2.tick()
  })
}

main().catch(console.error)
