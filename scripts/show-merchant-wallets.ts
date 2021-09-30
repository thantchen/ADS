/*
 * 가맹점 테라 계정에 남은 정산 금액을 전송
 */
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'
import * as Bluebird from 'bluebird'
import { Big } from 'big.js'
import { ArgumentParser } from 'argparse'
import { LCDClient } from '@terra-money/terra.js'

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
  [ 'm:0bc662e6-006b-4cd0-9512-2360d46dd1af', 'terra1wq43yen2q3t0gd2geth0kwxy20k2jdyrk3hvja', '룩옵티컬' ],
  [ 'm:222f9d0e-93c2-4106-a480-6966e084142a', 'terra1yy7m8rvmxnvx7ef20le4nredhs0t6vzamsv0r0', '원할머니보쌈족발' ],
  [ 'm:3e7b411f-06c9-44d8-90ab-80ae16adc66b', 'terra1fn89a8d4jqjkk762ehs08f5h5zvn9u88retpny', '불고기브라더스' ],
  [ 'm:4f7bf805-2fc8-4bc9-9285-5e4884c439be', 'terra1ckskxfzgqx2myca04j0d6wqzf2f0asgtkwccgj', '야놀자(데일리호텔)' ],
  [ 'm:5ec9e820-818a-4d17-8c7b-c5b3484f03a2', 'terra1amykaj6wsh4ngruu7hftrtrdu7f9lx0nvjv66f', '못된고양이' ],
  [ 'm:a452c3de-11f4-4d4a-b64e-79e132658b91', 'terra1yr4ynrg5q0z0gdue06vyfj83tk23md22hkgv0r', '카페드롭탑' ],
  [ 'm:dbb0e17a-9630-4f21-b2e9-ea83bc4cb921', 'terra1577edzn5rx5n020dlhgtrvgs2acheavj4lcaqa', '커핀그루나무' ],
  [ 'm:e5077c04-b179-4477-bfd5-011adabc67cc', 'terra1x4776zjay0k272n65uy43q5lhjjv5lf4yqardd', '라이언치즈볼어드밴쳐' ],
  [ 'm:12f0878e-9ca4-474c-ae22-5dfa92016b7a', 'terra1w03zf5c6t6r2n68n4umz3yvjsgtkmma3d4dagn', '커리지(TBD)' ],
  [ 'm:34f2eaee-df74-42bf-84e3-7dd7dc0af2f4', 'terra1mhljjyeh9s6l8w9f7z4frn2m9secxdsd2rj9nh', '위메프투어(국내숙박)' ],
  [ 'm:7c1cf9a5-be66-4771-a319-9642a8113da3', 'terra1y04x0kn2qrlg8229wuhnmm70y6avxzcrkah2h7', '엔제리너스(TBD)' ],
  [ 'm:9f8167bc-aa27-4d20-aa07-577314a63730', 'terra12n0n6wswx9r82mnkcacg3wuvasxwfvlk82l6cq', '위메프투어(액티비티)' ],
  [ 'm:08d8eb4a-22a1-4f72-968c-b4b42b8a6875', 'terra1psfpxryrvxveus32mjpt6u987kr343q3pxypun', '동글' ],
  [ 'm:c4ad09c0-e50b-4e5c-aa5f-eef26aa360c9', 'terra1df350s78t2fln58uddpnve0l5wsugl6yqpe0fa', '쿠캣마켓' ],
  [ 'm:017b485b-424a-49b1-88c7-6000827ea447', 'terra1ufsdet4x258kr2uxfjm5seh7c0ktwj6vcfjsv2', '번개장터(택배)' ],
  [ 'm:3ecbf11b-0451-4c82-bec8-a3d69763ee7b', 'terra1233lr5vf7uh27st3sramhdq6zckzyjufl3yclz', '펫프렌즈' ],
  [ 'm:485b18ec-612c-4c43-a83a-5984487fa375', 'terra1n4p7qfrzmynhvm0p6m3phnxxr4x0m95acmjek7', '배틀쇼핑' ],
  [ 'm:7ec628b3-85fb-4f27-9dd5-5f506f6b2bb6', 'terra1qk7e7fj8epan2zdrr8y8q9gwg7pwarfkzdzdte', '카모아' ],
  [ 'm:7efd2877-1c90-42ee-9f8f-9c6c42808455', 'terra17q48eqlg0ls5a9n4lxgywvgvv2lgugc4fenq65', '다노샵' ],
  [ 'm:a17b5ead-960a-4097-a2de-50a472421037', 'terra1mp3knehaq7w6fhev6v743arxs0k6rjdanseqt7', '레드프린팅' ],
  [ 'm:a8c32ad0-5f20-4eeb-9826-cec032dd9b6a', 'terra1d0uja5gczdp6elzn7gssjanj3e79k30mzllcw5', '아임포트' ],
  [ 'm:b4420f2a-e5ff-4339-85be-fc4c966efdb5', 'terra139q8vttm7tjex37ed77xuzxqrvfxku87evm893', '야놀자(모바일교환권)' ],
  [ 'm:b98df440-f3ec-4b4c-aa31-e55602634d62', 'terra1xfj29satyxdxczt0e082rv2gestygndg0cwydw', '위메프투어(패키지)' ],
  [ 'm:d2c7a1d9-92fd-4490-96a8-67932337247f', 'terra1kg20rhpau38r0argakzyj5eey5tft55svejgkm', '메이크샵' ],
  [ 'm:fed91f7f-4154-4db8-b7f6-22a898dbf997', 'terra18eldgrg4aru5pae4mvgtnfz6x2ah0zymscgkuz', '온다' ],
  [ 'm:3611caef-12ca-4ba5-8108-ec0e44b22ab6', 'terra1xw0uhyela22l7np8p9sh6xfymu5nf8u6zvsact', '' ],
  [ 'm:657eda9e-7eb5-43be-b6fe-0611e7df57ab', 'terra1hdnu59eh4xvndsjvxwxw838hnhf023la6779vc', '' ],
  [ 'm:04fc41cb-4028-4548-ade1-fa71970268b0', 'terra1d0qxypwwyly5r2nn74sx3l3t9tssqvfr3d0ek7', '' ],
  [ 'm:0540e850-82ba-4640-8d3c-857c84754e34', 'terra1683yva68q5824aldk8a9xt3u8vt5w3geujx0ca', '' ],
  [ 'm:064905a9-9e68-4a32-92f3-4a2126217c0f', 'terra189qjsa3cyc6eeunzu0qjfd62l37erjs6dwnf5s', '' ],
  [ 'm:125c32ab-080b-4231-9432-00c31d0171cf', 'terra1ysa8u7ejcgvh05s228wevwhclzkmtsxthzgn56', '' ],
  [ 'm:15e37e45-8790-43f6-a5e7-b814556b1b23', 'terra1k0kvytw6ynu298uraz67vqfy52t7f586pz0l70', '' ],
  [ 'm:16b357e7-a787-499d-89ce-f19ce9fc1992', 'terra1s3xu29u63l85av44u7a5s7qund0m28y7pfrrmh', '' ],
  [ 'm:2a662a64-fb13-4c2d-a8b7-137a90639c0a', 'terra1qjm39kkgktmeqlnwgy4l0c7w9mqmnu7hw2j6e9', '' ],
  [ 'm:2dbf1d87-bc46-495f-a3f8-15c86b4cd9ac', 'terra1mrvklkd5tvf93z0n5sy85tv6rfnkk2hk0vf8l3', '' ],
  [ 'm:2e4daa69-8277-4740-9a10-920d7df80037', 'terra1dcwtw30fz4f4s6pwqfm2fl75efscdg3hw0rpfh', '' ],
  [ 'm:411badc9-42fe-434a-8f4b-55e93dba13d9', 'terra1dpj0nh2v766nl30pp8asqa5fzsvzdx7ch5j2dd', '' ],
  [ 'm:5cef2091-0388-483c-802f-803ff2228e81', 'terra1l5udgm9lajafd8zyrum5lg85frk48ptwvaa2ky', '' ],
  [ 'm:61c2f7f5-df1f-46a9-8bf2-a2ac315f4826', 'terra1hhwfe4k20wdaqwlvdahuhpw5zk0tw8e4sc34hu', '' ],
  [ 'm:65f2e40f-d32a-43b4-bab7-2070c6209cc9', 'terra1lflqxnh4c4z8qxcr94jpmkvhnkvx3ft88ue249', '' ],
  [ 'm:6df0f046-370f-4881-964e-b4d9080580c2', 'terra1j4eug6yscapcgxeyjnlyuax5dcursgzhpauau9', '' ],
  [ 'm:7d06021c-33aa-41d2-8dff-fbf875db8010', 'terra1w9ed3y8rswym45j49279wgh26aquseyx6w82hj', '' ],
  [ 'm:94f02722-1c47-4054-9bec-899ec6fe1046', 'terra1vu3djg2ruhm4f9napnl4pf3nj8gwfh385yqjwn', '' ],
  [ 'm:a1474fbf-d17d-490a-afec-f110574df9b7', 'terra127cg5f3h2jd97tfzpum86akkufm2q0h5rr8a4s', '' ],
  [ 'm:a54ea4fe-ba8c-4d36-b96c-448f3444485c', 'terra1umzqpajaj9yqnffquma4see63zeyce7447gnj8', '' ],
  [ 'm:ad2088b1-0396-49e4-872f-fc40a8504df0', 'terra15frjduy7j2m05ena7h6msfnvv5fexjlvgrla8j', '' ],
  [ 'm:d93930e5-78bd-4ec5-b793-014cd5808c04', 'terra1np4gl38cv9umarshgvhau4jpe8kfatqmfd5duh', '' ],
  [ 'm:ed7d613e-a620-4988-98de-aae246956748', 'terra13lagv408zepq8jauqxtrjrd0j2su3rknppzhz7', '' ],
  [ 'm:f9bfd4de-dd3c-4484-951d-85fa9fa43d77', 'terra1qx460e9k4adck93xkrq3ukvn5kyqm8xs7elz0z', '' ],
  [ 'm:f9fbdc72-26c7-4286-9c82-c67cef192c72', 'terra1sqfc6pwlwkqx9nkfkwd08g80yyl9zc0wuy23g6', '' ],
  [ 'm:03c9d605-54e9-4584-9dcf-19079a7285f9', 'terra1hj68wz7uytd82an4l9ule0de28al5g887azgsk', '' ],
  [ 'm:166a693f-b4b7-4319-82a0-84eccf187efc', 'terra1rksyru96qdc53yuqv3vqenxjhua5sgfmjvrkxj', '' ],
  [ 'm:1795b553-a94c-4619-85dc-bdb0f93f8a02', 'terra1342jlm4v2k8e6gzzer6hev886el4hzj2mtak7x', '' ],
  [ 'm:1895b721-602a-4841-93ba-c59ebb06e325', 'terra19mmveusck6253cmu3uac83cxakh9pnvk923dmt', '' ],
  [ 'm:1af83137-d8d9-4b99-81ab-a2b39640ed9b', 'terra1k4jkkm57c80cy90ql7q4rme7dervt8ud4wfv3h', '' ],
  [ 'm:263194dc-ee67-44b6-a040-1c5be770f50c', 'terra1lukaq323qpqn0gs9vllm9w7ahvwk5rq8rdgqku', '' ],
  [ 'm:2907332d-617d-4428-83a5-8afae2a29db8', 'terra1a36pt2aa64593kcfht0yv3vyhge8ur0cpxpksk', '' ],
  [ 'm:2d3e4142-41f6-4d7d-9701-b005845dd727', 'terra1tfx990ku7qm5gjv90x3vlq3euzcxhcxylvrcfl', '' ],
  [ 'm:2ff170be-43be-45de-af39-ca85ecc2f794', 'terra1mxpvcpw84afvmeamuk7h73cz5ajhd2tcurplmk', '' ],
  [ 'm:314c988e-d01f-4f78-adee-ee00d9ff3e03', 'terra1dxdstcj2s9k59d2m0yhge7ls0lp3hphyzzkxwk', '' ],
  [ 'm:344d583e-203b-4d2b-b484-c45f217f97df', 'terra1k2xe9pcqgq3xs99syw8s70h768ckj0x3fx8xhs', '' ],
  [ 'm:411667d6-2426-40ac-aaeb-19c28a5a3032', 'terra1s47drfz6wc07mrwu53wp5w98x9cwlmf0vpecjj', '' ],
  [ 'm:43085b63-b4e4-4293-842e-8adf14386c58', 'terra1zvmtzke4s4mzn9nmluqrgfl2xwhpcnan0734dy', '' ],
  [ 'm:559fba9c-621c-4c28-b083-fa44316e25e1', 'terra159v6kfer6k9f9sl88adczxj5l6r868h2ynt37u', '' ],
  [ 'm:5fca06e4-1431-4b3c-8d67-06f8e66016c6', 'terra1zh9ynz4tke4krncsu0lfsv2m8dm8p2dfjp9kfm', '' ],
  [ 'm:6b8c80aa-431e-4711-af0c-1f683d1c6546', 'terra1nymey64uwupxzlwkm8uwfj475adsksvrn87cpz', '' ],
  [ 'm:6c8dbd5c-df68-4cec-9dac-533aa5fe4dc4', 'terra17z9ppn0aecrtcc5ehckkypqp7xhpuc9lpsedrl', '' ],
  [ 'm:75ebaa5c-ce8e-42c9-a951-3dac8f6a6c11', 'terra1vhjs5jsgpn7y82y6lf0d25l5pj7mhln3c3dwz9', '' ],
  [ 'm:8af07bda-a621-4daa-b737-c1be87ec612b', 'terra136pwslgp9uu82h646swtwclcu6g26j2fp526aj', '' ],
  [ 'm:a0b25905-6bcd-4515-a4b3-ad2eab8d3f75', 'terra1tqt3upefd8paxynyx7kyrus9w3wd3v2qfxtdtg', '' ],
  [ 'm:ad947e9e-6b6c-482b-9c78-b32a859bc95f', 'terra1p84tvcp8pk2duptxkmju7v5vl7pf2jmnf30h2w', '' ],
  [ 'm:b35dc2cb-c6eb-4fa4-aabb-fc2ccc00eaa7', 'terra172rd5dtkgdjdnxst6wf89avzzxdh04s38jkgz9', '' ],
  [ 'm:b5688fbe-c832-4fa6-8e8a-eb4288bd49ca', 'terra1mkecd229xl406xkmazhuh4vm9h5ksnw3nw3f26', '' ],
  [ 'm:c7806581-01bf-49eb-84a3-d0f24aff2b62', 'terra1mujpt70e3c9v3algdlsn7ra5cv5a8vce0hkp8w', '' ],
  [ 'm:caaf4af6-7094-4e8a-b62e-ba0bb632d95d', 'terra19hnq77j722jcnyz9j2smc57udqy8mhw0py6wel', '' ],
  [ 'm:d9a5a2f3-ad50-4bfc-a0ba-e6f3f8302e92', 'terra1yvtfs567l0hcq7vw2sjzjcxr5runqth2cjff0n', '' ],
  [ 'm:db7b4b37-5694-44ad-b890-c86845c18a73', 'terra1ymgvjtwgay7847gm4wtel5yzpjlsu35u4v0ajk', '' ],
  [ 'm:f263b51d-f129-44b9-ab5d-c4a17b1ccb9d', 'terra1hnn9hgrdpv83eclx47k5tt305y2fl9mccavf0d', '' ],
  [ 'm:f4f79ebc-f905-49cd-8010-dfb62b1cc12a', 'terra1n3w8xklg0sqqkuxd7h97kef60rpckw6d9mwvh7', '' ],
  [ 'm:f742146e-1df5-4a18-a1bc-acb3909bf4a7', 'terra1lh060tyg8ews996ta6ts8q7aet4td4nk508evv', '' ],
  [ 'm:fe686414-1bcf-4b46-9790-cccaaf5ec281', 'terra1fe7qlcl95xgz4czm0u86wmwev2jl47gapk28hd', '' ],
  [ 'm:ff737882-01dd-4904-8d70-f95549861a5a', 'terra10d8c76t49aewm54kjhtkkswqwpct68r2kj0fqd', '' ],
  [ 'm:229113ae-19d9-44c7-8460-8731eef3eb73', 'terra16qeq3drpy9y942ymxthqt699fselfcmnac2rk4', '' ],
  [ 'm:2eb36708-4247-49f0-b2ca-a0560be66d69', 'terra16t6q7uaz7xs47xfszlqkf9lkvm6pkjewvexjc3', '' ],
  [ 'm:c3630713-a85f-4861-9a64-23ef15597d3c', 'terra1rrgpmv2qas5w2u9826evyx6cls8vfe7dwftvcc', '' ],
  [ 'm:d3826203-c85a-4e6f-9119-46ae906d469f', 'terra1h82x0ukzg4dvxttm05kwma5f638nzavdtw22q2', '' ],
  [ 'm:e48d0467-a7ca-4dec-b7c3-aee87a5040c6', 'terra1wkev5gnk75pa5ddswp5c7jg9y3f5v434nk9r8a', '' ],
  [ 'm:fcdb8112-bc50-4e60-9ee8-32ce59729669', 'terra15js44h5dmhca5aq2rkcn7vet28pdmj92ua7wxk', '' ],
  [ 'm:ffd2b50c-b16d-467d-82ca-a6225fc660a5', 'terra1gdwtgufg4k0c9x6eeuk3anle58nhjpr2x5dw8g', '' ],
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
  const parser = new ArgumentParser({
    add_help: true,
    description: 'Vacuum wallets'
  })

  parser.add_argument('--chain-id', {
    help: 'chain id',
    dest: 'chainID',
    required: true
  })

  parser.add_argument('--lcd', {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  const args = parser.parse_args()
  const client = new LCDClient({
    URL: args.lcdAddress,
    chainID: args.chainID,
    gasPrices: '443.515327ukrw'
  })

  const wallets = await loadWallets()
  console.log('Unknown merchants')

  wallets.filter(w => !merchants.find(m => m[0] === w[0])).forEach(e => {
    console.log(`[ '${e[0]}', '${e[1]}', '' ],`)
  })

  console.log(`Total ${merchants.length} known merchants`)
  // const terraDB = level(config.db.terra.path)

  const merchants2 = await Bluebird.mapSeries(merchants, async merchant => {
    //  const key = await keystore.get(terraDB, merchant[0], CryptoJS.SHA256(merchant[0]))
    const balance = (await client.bank.balance(merchant[1])).toArray()

    return [ ...merchant, new Big(balance.length ? balance[0].amount.toString() : 0).div(1000000) ]
  }) as [string, string, string, Big][]

  merchants2.sort((a, b) => +b[3].minus(a[3])).forEach(m => {
    console.log(m[0], m[1], m[3].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',').padStart(13), m[2])
  })
}

main().catch(console.error)
