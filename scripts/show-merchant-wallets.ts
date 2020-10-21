/*
 * 가맹점 테라 계정에 남은 정산 금액을 전송
 */
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'
import * as Bluebird from 'bluebird'
import { Big } from 'big.js'
import * as client from 'lib/client'

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

const merchants = [
  [ 'm:92b821b0-9f6c-4816-b271-6f9c7007beeb', 'terra1u6k46w32qxxkktlj4met5aak2nr35v9yj73vkk', '야놀자(무한쿠폰룸)' ],
  [ 'm:5aea1073-91af-499f-bbf3-5585ec47021b', 'terra13x7p0nj4j8qq2hczhtpyzedzshejwn7r5jt0jx', '야놀자(바로예약)' ],
  [ 'm:8ae2eddb-2dc6-4783-ac81-c3334b94714a', 'terra1gy3cq34px8nw2qep6h02gs9403przevda7pq88', '개발용 티몬' ],
  [ 'm:af3df620-e1f0-40c5-b0ca-6eb8d862d785', 'terra105rz2q5a4w7nv7239tl9c4px5cjy7axx3axf6p', '티몬' ],
  [ 'm:f7344598-7bd3-4f21-a4a8-fb0a3ccee2f3', 'terra1v9aggl8q3zplsz4hzvlh6v9jll899ak3h4thxs', '투어비스(타이드스퀘어)' ],
  [ 'm:6bfe11f5-23ac-4028-a9f0-e1f5ba02f0ff', 'terra1c9tve250xea3d9dztvljzep6mztwum2nyq28zp', '테스트 상점' ],
  [ 'm:3406c02e-59e2-46cc-9cc7-39c1d3e24c7b', 'terra1dvhc22vj3jtlv4c2e4v4ev49lyltsedfu8y3pt', '벅스' ],
  [ 'm:fdfa28c8-4a58-4fd9-a070-83427f31ca94', 'terra1tf86epu6t5l5h0ndmpxy9p8wtpl304hvxpkddc', '번개장터' ],
  [ 'm:6e97f61b-f2b4-49c9-bff2-3d3306c014e0', 'terra135gpph9jkx03cc594z5hey3xprrrhzymj62yyu', '아이디어스' ],
  [ 'm:a1b6a7f7-1677-49c3-b220-9f259b5ff0d6', 'terra1wa05ut0utgjg5mufnaeyne8crrn6qlkmry2r48', '데일리호텔' ],
  [ 'm:9e363756-04d2-43d3-aed7-6026b4558b09', 'terra1v9re350hxx4t5ajr89ayfej5kn6h7m4aaft08j', '야놀자(국내레저)' ],
  [ 'm:7b60e351-1e1a-4561-824c-0c2d4fbbcb31', 'terra1s3807xm4ypfdtt04sjkscawevmw4n7m3gmcrxz', '신상마켓' ],
  [ 'm:3c97e2c7-d631-4cff-ba4d-3810a58b1d07', 'terra1fkhqkqkrrrj8gq9ydkqruy30qs5zqwe377748h', '에이블씨엔씨' ],
  [ 'm:d048cc5c-7698-4779-9bae-601fc8009eac', 'terra1p8axkl97p7ztx4ahackwp6xu2zjdpt4p0f493r', '필웨이' ],
  [ 'm:fe7255e9-4469-46b3-befa-5714bceac20a', 'terra1az6ejg7vcvszuau6x3sf9qvj3quq6x7mkskx7h', '마리오아울렛' ],
  [ 'm:dc342888-fc79-4c01-bf8b-40a9b8a088ec', 'terra17wuw5vpa8nnerz6tn6v03wk2g493ygg9rzfvuw', '오늘의집' ],
  [ 'm:27616b2a-cd60-4180-9578-4f5be1577230', 'terra1ykwmfutlrj736uq7lqfhuejg48x8ltc278gaj2', '야놀자(해외숙박)' ],
  [ 'm:70aaf72d-5912-47a3-83ba-93ea1172e474', 'terra1dtrxq5p5aaupassaz6muflszwych8df344z83j', 'CU' ],
  [ 'm:3d27f37c-4335-457d-a211-6c0bef40de33', 'terra1g9pxfdhnc3xft76gf4daya4kp62awww5lchl29', '야놀자(국내철도)' ],
  [ 'm:3eb1c46b-9896-45f7-8f34-21880ddc2777', 'terra10r539pdwec6727zs05r9d8epp87qh0sgwnf073', '투믹스' ],
  [ 'm:4a4fc149-e91b-4ca8-9cbb-ff6b4da619f2', 'terra1xwhwyzglmqdax6lacxn28yncx43psv5yrkqyq3', '1300k' ],
  [ 'm:90b2cbc5-bb72-4fd5-91b5-ca593d44e108', 'terra1qr2nywgc4mx5xl90cafk4ntnf6deqvvsxlalhj', '신상마켓(딜리버드)' ],
  [ 'm:c4008d07-6833-454d-8253-44fe0822571c', 'terra1cn37elx6694vwqgnv95u62q6q6lxtdm6gz9mqy', '해피머니' ],
  [ 'm:f1b0bcf2-c080-4f2a-b372-7fc06f34a82a', 'terra1k0ml73wwgc2awatr0qpyz2rwf3gtcccjfekj5n', '마켓컬리' ],
  [ 'm:f1f5adab-edde-44b5-91b0-53f5cce9ad60', 'terra1g6vtw945awljltjqf6q78rnneeeeqlfmp5xs3w', '바닐라브릿지' ],
  [ 'm:41cfb9aa-4092-4453-9999-53d570d69ef1', 'terra1wcpfs908s0t8ce6dum9r0hftjnfwx6cqxf0l2r', '10x10' ],
  [ 'm:4fdd5832-e286-4868-86df-ac8be4db73dc', 'terra10t6y2hpcpupcml5778v7lq9dk9f7fk254nt56m', 'WConcept' ],
  [ 'm:22120b5e-9198-40a9-930c-dbcfab385546', 'terra17ucalrfw3fknr9q7gw3hnfaauf4kkv6al3zfme', '위메프' ],
  [ 'm:5558ba05-6f87-4a3a-8f97-97a03b17073c', 'terra1k64v5l5tejv4jkf2pmjxc3lk4l03j8v4vvt6f3', 'KG이니시스' ],
  [ 'm:3cc1e678-f6d2-49bd-b3a0-1ffd5de03049', 'terra16z8jsaq0aw8qyazm02cahwgm6zwaat8hmz0q3u', '교보문고' ],
  [ 'm:63169aeb-9d3c-46a5-a675-f9d06ad12a42', 'terra1x6y637wc4z6zeylu8wvhjg693y68jp63er97vd', '네오플' ],
  [ 'm:65f52b94-9efe-4f58-ba5c-12c24192e088', 'terra1vd75zv2tvgva40r6rhdzmw35duqrhl720ephpp', '넥슨' ],
  [ 'm:e990f5e1-4842-431b-b7aa-a4fdfc28358a', 'terra1p6kg27mkcul2rxm5z33jufk3ewht7m00xefx7d', '인터파크' ],
  [ 'm:0385e3db-4a50-4035-9285-1ced4a3e0209', 'terra1pzgqghunpfyv5n4ckqud3t9aq2teqcldect35j', 'BC카드' ],
  [ 'm:4626e2be-78bc-428a-9c6b-fd5459d3fb3a', 'terra12lqm8e4smhjtj66qw42d52j48amnmq6m35nkgz', '소셜클럽' ],
  [ 'm:558f88b1-6017-4ea3-92e6-caaadb2bc0fc', 'terra1cvp5sc72c8t9vyn4j8w4ux44l09fq8f2hqxrc2', '아프리카TV' ],
  [ 'm:846d6b8e-9807-4d74-acaa-7ac8244b84ae', 'terra100u9zkx9r3vwhuzzqrqma37c6j3d4d8tszuqgd', '요기요' ],
  [ 'm:c6e76919-5bf7-43ef-a350-c74e3f83f20c', 'terra1e908zvgmr4r8h7sxe70d8mpv8t6y2zrd3k8fax', '헬로네이처' ],
  [ 'm:cd83baad-c201-4a8b-b9b9-dc5dde5c6b12', 'terra190frrcw47e2mufq3w5gqla9w8qxsqvmva26l7e', 'CGV' ],
  [ 'm:cfcb0179-3ee6-4915-8f39-f0ed054c1d71', 'terra1hmsv0qdenvs623x79yspt476rtqlj6mmvrmh6a', '캐치패션' ],
  [ 'm:ffba231e-b131-4b2b-9d5a-919e886a49bb', 'terra12uzvx4jyga0es88gyk7ylz8xcyrn3fxu8e7374', '인터파크(국내숙박)' ],
  [ 'm:832ea611-379d-4941-b175-9bb0a8d589df', 'terra1dy4sf2h304wt093qgp887gcgqn9gc4vfn7ffwx', '인터파크(문화비)' ],
  [ 'm:95d53d45-6698-4fa9-91ab-5d8f6191b63d', 'terra19ruuf8htp3p8jsmkv2p63pp252fysf2xkzqhtv', '크로켓' ],
  [ 'm:4aa901b6-f20c-40e9-ac5d-2fba7ef1cc71', 'terra15jh9a0hl3x8d2cdt6ht63r5fpc29chan7ku8z6', '인터파크(티켓)' ],
  [ 'm:17a3c0fa-f6d7-482d-a932-2230fdb9b9f3', 'terra1pemupkxtf7z4p49enqjar6w4egv4ggjr7am9hc', '밀탑' ],
  [ 'm:2392c85a-f8d9-4f83-89c2-3e8de3c7753e', 'terra1nvs44mw8qvv3t6nk8vq8x4am5560vnsk00y22f', 'CJmall' ],
  [ 'm:c1335133-6f50-4cbc-9b57-90602a38973e', 'terra1qs5e6vclaqlxxhusjt5zuydxw9fsm7kv3yzvls', '설빙' ],
  [ 'm:0585e352-cdb0-4275-8656-47344ddb106b', 'terra1xds9slgqwenpmafs7thr6wld55kcmzj045u2fx', '또래오래' ],
  [ 'm:23815570-d218-45e5-9cc5-5d7c4b12298f', 'terra1a8dla2swj7mka9cyjr7dgtkuuek2uvzq7f7s3w', '타이거슈가' ],
  [ 'm:29e25b99-7ce4-4525-be9f-680d7839c8a8', 'terra1rg92d0rd3hq7j57hk4973mqrycxxnwjt2l29lf', '셀렉토커피' ],
  [ 'm:5198d89d-6be5-4e22-a196-7d40d98c20b9', 'terra1cydayh59cvzgvut2rxsackxu62krcxraj9323p', '카페베네' ],
  [ 'm:9ded8085-de6a-48ec-be85-1d89ff7c4171', 'terra1dzmdjsz624wnsv6zkuqxeq5nlg339hmtl0v4vq', '프로그' ],
  [ 'm:d8f7cae9-64c2-4dd6-a2fb-ec066e8285d0', 'terra15c2q75q9ag9ka5zkrgqs8l47rxa7404gg96fx8', '매머드커피' ],
]

function loadWallets(): Promise<[ string, string ][]> {
  return new Promise((resolve, reject) => {
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(path.resolve(__dirname, '..', 'mwallets.txt')),
        output: process.stdout,
        terminal: false
      });

      const mwallets: [string, string][] = []

      rl.on('line', line => {
        const [id, address] = line.split(' ')
        mwallets.push([ id, address ])
      })

      rl.on('close', () => resolve(mwallets))
    } catch (e) {
      reject(e)
    }
  })
}


async function main() {
  const wallets = await loadWallets()
  console.log('Unknown merchants')

  wallets.filter(w => !merchants.find(m => m[0] === w[0])).forEach(e => {
    console.log(`[ '${e[0]}', '${e[1]}', '' ],`)
  })

  console.log(`Total ${merchants.length} known merchants`)
  // const terraDB = level(config.db.terra.path)

  const merchants2 = await Bluebird.mapSeries(merchants, async merchant => {
    //  const key = await keystore.get(terraDB, merchant[0], CryptoJS.SHA256(merchant[0]))
    const account = await client.queryAccount('http://localhost:2317', merchant[1])

    return [ ...merchant, new Big(account.coins.length ? account.coins[0].amount : 0).div(1000000) ]
  }) as [string, string, string, Big][]

  merchants2.sort((a, b) => +b[3].minus(a[3])).forEach(m => {
    console.log(m[0], m[1], m[3].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',').padStart(13), m[2])
  })
}

main().catch(console.error)
