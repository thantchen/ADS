# LP Server

## Highlight
* 문제 생겨도 중복 전송 또는 유실되지 않도록 FIFO Queue 처리

## Requirements
* Node.js (TypeScript)
* Redis Server for Queue
* Terra LP Wallet
* Tempura LP Wallet
* Tempura Chai Wallet

## Setup
* Terra / Tempura에 각각 LP Wallet 생성 및 입금
* `yarn import-key`로 월렛 생성 (로컬 level db에 저장됨)

## Server
차이에 RESTFul API를 제공

### Specs
* 사용자가 차이를 통해 결제하면 LP Server에 DON Claim
* 가맹점 정산할 때 KRW Claim
* 결제 취소한만큼 KRW Claim

### Endpoints
#### POST /claim/don
Request DON for KRW, pushes to redis queue

#### POST /claim/krw
Request KRW for DON, pushes to redis queue

#### Common Body
```
userId: uuid string
merchantId: uuid string
amount: amount of DON or KRW
```

## Batch Terra
Terra LP > Terra User(s) > Terra LP

### Specs
1. lp:terra:queue로부터 값을 읽어 lp:terra:send 리스트에 값을 넣는다. (MultiSend가 두개 세트로 이뤄지기 때문에 중복/유실되지 않게 하기 위함)
2. lp:terra:send로부터 값을 읽어 MultiSend broadcast

### Usage
--lp-key, --lp-password는 import-key에 입력한 값 사용
```bash
$ ts-node -r tsconfig-paths/register src/batchTerra.ts \
--chain-id columbus-2 \
--lcd http://localhost:1317 \
--lp-key LP \
--lp-password <password> \
--sig-limit 100
```

## Batch Tempura
Tempura LP > Chai or backward

### Specs
* lp:tempura:queue로부터 값을 읽어 send broadcast

### Usage
```bash
$ ts-node -r tsconfig-paths/register src/batchTempura.ts \
--chain-id shrimp \
--lcd http://localhost:1317 \
--lp-key LP \
--lp-password <password> \
--chai-key chai \
--chai-password <password>
```

## Technical Notes
* keystore 엔진은 LevelDB 사용 (위치: data/terra, data/tempura)
* 테라 월렛은 userId 찾고 없으면 생성한다
* 니모닉은 별도로 저장하지 않는다
* Terra LP > Terra User(s) > Terra LP 전송 후 1ukrw가 남을 수 있음
