import * as level from 'level'
import { generateClaim, generateStdTx, generateSend } from 'lib/msg'
import * as transaction from 'lib/transaction'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'

const db = level('data/tempura')

describe('claim', () => {
  const msg = generateClaim(
    '1000',
    'tempura1wunufyfntxzkqaluvwjeudd7rt4c4cc96szp4v',
    'tempura1eml8cxegk7zuxz3k6z5rwtvctmh8kj8md2yxe4',
    'tempura1r3q8yc5g8eewlqfya3hwpwtzqdyg509a0ljg42'
  )

  test('msg', () => {
    expect(msg).toMatchObject({
      value: {
        amount: {
          amount: '1000',
          denom: 'don'
        },
        receiver_address: 'tempura1wunufyfntxzkqaluvwjeudd7rt4c4cc96szp4v',
        target_address: 'tempura1eml8cxegk7zuxz3k6z5rwtvctmh8kj8md2yxe4',
        from_address: 'tempura1r3q8yc5g8eewlqfya3hwpwtzqdyg509a0ljg42'
      }
    })
  })
})

describe('send', () => {
  const testAccounts = [
    {
      name: 'chai',
      type: 'local',
      address: 'tempura1r3q8yc5g8eewlqfya3hwpwtzqdyg509a0ljg42',
      pubkey: 'tempurapub1addwnpepq0muy94tzpe3h8s52cv8qduplw96jhgxcayc8xzch2yugu8qt8ywy5a3q9l'
    },
    {
      name: 'flexe',
      type: 'local',
      address: 'tempura1eml8cxegk7zuxz3k6z5rwtvctmh8kj8md2yxe4',
      pubkey: 'tempurapub1addwnpepq0k02ldc4kvjkpeqaygat4ugknwpgsem3rx75vevtw60flkxznvjunyg766'
    },
    {
      name: 'test',
      type: 'local',
      address: 'tempura1lh4c9462gvxtahyrknvpy6nmk02s9s5837w9sx',
      pubkey: 'tempurapub1addwnpepq2z6js99swed7kyflyka0dc65yxp4pm9crtv6mmj427nx60kpzp0qgdpd7r'
    },
    {
      name: 'user1',
      type: 'local',
      address: 'tempura1wunufyfntxzkqaluvwjeudd7rt4c4cc96szp4v',
      pubkey: 'tempurapub1addwnpepqvgugf9n2ah3swj2csnkywuh6eva50mp7ljruskqunj7f9gt57ckcsw83gj'
    },
    {
      name: 'user10',
      type: 'local',
      address: 'tempura1cn2un7hqnljzha8uqv088ge4jqc04ahh529yxx',
      pubkey: 'tempurapub1addwnpepq2wwmsxv6hvg9ejvp6v02kp6ud5gp0qa8h2xly4hcpmfk8zymstn65ucw3s'
    },
    {
      name: 'user11',
      type: 'local',
      address: 'tempura1psfcha3qx7ug9r8teqxzhkuj46shtu6kxg2v6g',
      pubkey: 'tempurapub1addwnpepq0j29dav6dgj39563pzwezr5a6yv6zcvfuggd06cxqrf0lqfaq73ktqxfj8'
    },
    {
      name: 'user12',
      type: 'local',
      address: 'tempura1dm59e77r2x4qy8n4yfewt4qz932c2alg72u2pt',
      pubkey: 'tempurapub1addwnpepq2za5ddu6ufdrrrlvnzgfmrms8j8ce03lcvdwzsze755jewf5emyxqkjnya'
    },
    {
      name: 'user13',
      type: 'local',
      address: 'tempura1z4r8srwylgjatyvsv8gn4pf49zxvlf3947j96e',
      pubkey: 'tempurapub1addwnpepq0skd2u9ekctp32zpt58s7fdnpkn62rnpswy6lxr8pwc6jzqun49vquqtp2'
    },
    {
      name: 'user14',
      type: 'local',
      address: 'tempura1fvdv5yex6ukympsrwl7c03vdvjtfkqsh2gpjar',
      pubkey: 'tempurapub1addwnpepqwacg402f69hf4enhf37r9xn5p77lewxy2n5033g0elhh3zyyra7skytkw6'
    },
    {
      name: 'user15',
      type: 'local',
      address: 'tempura14k8evrqlqxleky9j70sh4lchtxyl9nezqrhs2t',
      pubkey: 'tempurapub1addwnpepqt3zlauz420rs3gsxqxxak5jnz0afjqaellkw7cmjyku3fneahkq6l9f34g'
    },
    {
      name: 'user16',
      type: 'local',
      address: 'tempura1klce9da975q78y9vmyl95fm29dcdjfxek2ggez',
      pubkey: 'tempurapub1addwnpepqd9z265s2wm6z4zqla6auy56ymqdc4ehe3zld6wyhpprc9q2qdvqslx6l0t'
    },
    {
      name: 'user17',
      type: 'local',
      address: 'tempura130mppn6272lepuajgnm8tx5wn78qaaqfqxejmj',
      pubkey: 'tempurapub1addwnpepq2mrpye967agt83tmhyzcvzxw2wny6m0j07m7csvp8u0tk98qret6qscwfv'
    },
    {
      name: 'user18',
      type: 'local',
      address: 'tempura1k2n7cacfzzxagmvc0v6wxs3szz0v3s7yudeaf4',
      pubkey: 'tempurapub1addwnpepq0d94vfhedy6jxkzgvs72hs8xvxvqvlann2fuw8nd66v3n0ksee4cqdaqwq'
    },
    {
      name: 'user19',
      type: 'local',
      address: 'tempura1uplvxpeqgnqx9heja8n678wqk708e43rf8h3e8',
      pubkey: 'tempurapub1addwnpepqw8j4zm2qpft3wgfk7rge9f8ksv25uk50q44p3jzpvd0zfa3gad27f06m4l'
    },
    {
      name: 'user2',
      type: 'local',
      address: 'tempura1tg30hrffsnf83ftugcchjdj7xt5px4rv7t3nms',
      pubkey: 'tempurapub1addwnpepq2xang87cr2cnwnznmg76sw48ufxksd39e5u3u42gwu56xw6029dgxdrt53'
    },
    {
      name: 'user20',
      type: 'local',
      address: 'tempura1n5detvcc0k6ezjzjknu6k2fsg83vuy37p6ehhj',
      pubkey: 'tempurapub1addwnpepqts3fv0snn5p54dvezxvvyqfk2txy5ran4l5m098l5hd9qv8kyn6x6pl4z5'
    },
    {
      name: 'user21',
      type: 'local',
      address: 'tempura1t298glvq340h3p8qyv629g5rx56prcccjm02jt',
      pubkey: 'tempurapub1addwnpepqwvx4dxjqhhww702gfcu7gm6g3m0kvm0qjaqp6h38nt93vzeg5q8ye9nf82'
    },
    {
      name: 'user23',
      type: 'local',
      address: 'tempura1fmpaw2druq7ukh362uxwc26xuchkqug6q0wtp2',
      pubkey: 'tempurapub1addwnpepqdmx04vl9ngahtjfsnc3yc5gczhhc9r0pdrkd0hzayrwsra3leyrkukfpwz'
    },
    {
      name: 'user24',
      type: 'local',
      address: 'tempura1dpqjsfl4uznvgmy93cu9gjqvlf8078hna9cydh',
      pubkey: 'tempurapub1addwnpepq0yffuu08l2yy8txq65zgaf3fh4yddh4t7z974ezf6zk0czsramashnfkf4'
    },
    {
      name: 'user25',
      type: 'local',
      address: 'tempura1rppj6fs4nwxykuh5vuwy0j5w8d3mxhcds8h84c',
      pubkey: 'tempurapub1addwnpepq0wzyzda03kffmupzfns64sdshsnjeh3p7vuwcwgz33uyw6e8hg6vaqfj68'
    },
    {
      name: 'user26',
      type: 'local',
      address: 'tempura1553ye5gf6gftchq7uj8lmdk2r6rdadccu0u7w3',
      pubkey: 'tempurapub1addwnpepqw4vaqc58kqywntxqdkepmvjev74pftg2j79dyf69mp2seara278qwy94jh'
    },
    {
      name: 'user27',
      type: 'local',
      address: 'tempura10lv9smv5kwnv97fjfyenq27t4s282q4rw5p7xj',
      pubkey: 'tempurapub1addwnpepqgxrgqkmlpye5h6d69wu6xant85pc7ml6nn69uhgs9t7dype3j3xytxv2l6'
    },
    {
      name: 'user28',
      type: 'local',
      address: 'tempura1cep023dy30d7q43wuggm82dsdsea5vz0rr4euz',
      pubkey: 'tempurapub1addwnpepq2t5xdgpkwvglv6z8dl28sxh2zflne58zj7fq3mv64temm9ggypx7crxfg6'
    },
    {
      name: 'user29',
      type: 'local',
      address: 'tempura1ks69grslrz8kakvh6ejgd0n679ygvg8dk3dzlw',
      pubkey: 'tempurapub1addwnpepq0f53yjpk3wef8ppqkmnzv0emqqmg0nff2cfh5kxrx5ng0lcncq7j0a59n6'
    },
    {
      name: 'user3',
      type: 'local',
      address: 'tempura18kye69usd7wkqxnh7tj22yvlhlxnlgpq9p65zw',
      pubkey: 'tempurapub1addwnpepqtrm2tr93q7fn8d2cnyjzeck3mdtnudk2a2lmdeqnqzsase78w6uklmyfw9'
    },
    {
      name: 'user30',
      type: 'local',
      address: 'tempura1y7a6wlh7rjkgl7suvlsc60r4wvrcv8qll2nya9',
      pubkey: 'tempurapub1addwnpepqdwj3f455v4nv558sxmspepdq728pga5gp8am32za0rgmvkvfkzvw8j0rqe'
    },
    {
      name: 'user31',
      type: 'local',
      address: 'tempura1h6tgx5dsvjzs8ss4pafsvvcw5662wu49njf648',
      pubkey: 'tempurapub1addwnpepqgjey2j022fsrtkluxyw75mzsvu85vkqavhme34ugj4zpwvakmlgj9am6j5'
    },
    {
      name: 'user32',
      type: 'local',
      address: 'tempura1cf46qez5rzdltsgx3dz7uu8f874yampy5m7gs5',
      pubkey: 'tempurapub1addwnpepqfphmjk75ddtghwfa2w9qr7yxq4swxa7psyp9htnhwu4tqnsd66hut3kjxy'
    },
    {
      name: 'user33',
      type: 'local',
      address: 'tempura16kz2r6xv0nydvm6mncazsj94yj5054nh09zqmn',
      pubkey: 'tempurapub1addwnpepqtsejluzszn0dxry4d2e7qxht0jyzm9sfaqw4gsyxjqsp4860hhgjk86ze9'
    },
    {
      name: 'user34',
      type: 'local',
      address: 'tempura1p9xxcwwq402ydx3pe43v8swu4xcea7aarzsl0v',
      pubkey: 'tempurapub1addwnpepq22wss9qgv5h3tcrv9mfs3khd5lyfaj9u8zxn850qlyu6j472pglka84p72'
    },
    {
      name: 'user35',
      type: 'local',
      address: 'tempura1jmhdwzkxxx7l4gknhtl9897aj7t4wskkdclv6l',
      pubkey: 'tempurapub1addwnpepqvauc36mcruuuxaw0q353lyevfjpgqgnmcpfxsexzfyh9h70ee725cqglx4'
    },
    {
      name: 'user36',
      type: 'local',
      address: 'tempura1duyq4fswldutu0u3k0l2jc7ylwmcpsvmcmcnn2',
      pubkey: 'tempurapub1addwnpepqvs0rg2cfuqkczm5whz0tcnxkz2y9hwnescxxndzfk2stx45rgeyufr8swc'
    },
    {
      name: 'user37',
      type: 'local',
      address: 'tempura1llqadfgpt3x8j320cjldtsps8ssstly6tgtawz',
      pubkey: 'tempurapub1addwnpepqfqg6aks3y5afeh330xn2x2gdxsgkusp8n8gy28z0na9rzfvhvnhs2st9p6'
    },
    {
      name: 'user38',
      type: 'local',
      address: 'tempura1krefdx82e7hr2c8p24cekmd4h8l8xqy4vf59h3',
      pubkey: 'tempurapub1addwnpepqdhy8np65jmnm7afw7tmgwczhxmfe0dpyk96kmt7wj63347gmg0luukepzf'
    },
    {
      name: 'user39',
      type: 'local',
      address: 'tempura1mrkfe45chkrjk3mxd542v8y84v3gmyysz3wllc',
      pubkey: 'tempurapub1addwnpepqvaqd2cv8kpvh9m7vqaw7c5x0zequf8rzxdzah7yv5x3rdqkt5a6yvfwdxe'
    },
    {
      name: 'user4',
      type: 'local',
      address: 'tempura19tajcfka9kt5q2qh34jyggfzxteey0wfeh4p4d',
      pubkey: 'tempurapub1addwnpepq2fv5ttpuevu2ye9wte0zfuhr4xw4n96rf42lz339rkkqaav0q0myzqjp45'
    },
    {
      name: 'user40',
      type: 'local',
      address: 'tempura1y6peh6duhqgrnta80qd7y7xw525wnqhjtt9n6h',
      pubkey: 'tempurapub1addwnpepqgstk5l27lagzwa06tg98907d2ta5kddn7w20w8sxjc2n8szpcg92n00qrw'
    },
    {
      name: 'user41',
      type: 'local',
      address: 'tempura1djh5h8nua63x3pv070qvml2hfprpvvv66m5hvp',
      pubkey: 'tempurapub1addwnpepqt57qrvlf6cqyrh3l8ry8qdtqtdlzen8tp7fxkkuqf5h8awf3uzf2he9c6r'
    },
    {
      name: 'user42',
      type: 'local',
      address: 'tempura1x2sr3m5hz6nnulsq36nqtejet0hfggwqjcrfh0',
      pubkey: 'tempurapub1addwnpepqtvjc4cqplf69r6xlpr3p4v3e9lg9qp3lgthzdenm59363xw2765vayv830'
    },
    {
      name: 'user43',
      type: 'local',
      address: 'tempura1kt5v4ugakl5303y4ex4l2dt7nenewerhysq84u',
      pubkey: 'tempurapub1addwnpepqfxvl27pqx8yxdgysvkg4lt6m0gk5pa7ken5wp3xcqtuyuw7cquuwemxkc7'
    },
    {
      name: 'user44',
      type: 'local',
      address: 'tempura1z9v5wnv7ss8hp4jgscqvt2dnpajqdkewfclks4',
      pubkey: 'tempurapub1addwnpepqtxx80ccpj8j069888wj0lw8cgumq0ezqwvvdfts7hytpkmt2dquxlwhzmx'
    },
    {
      name: 'user45',
      type: 'local',
      address: 'tempura1patd4umax3dlpcgxpq35fml0q5g743kxtzmzsj',
      pubkey: 'tempurapub1addwnpepqgukvxt2pmk6tp0d0rd7a8qdkn6luqswh4h796t5nfwvmwpqt4syv46qxje'
    },
    {
      name: 'user46',
      type: 'local',
      address: 'tempura1sj68tyckkc3q63jk7l02yfvxk4lq5qxaanw2wc',
      pubkey: 'tempurapub1addwnpepq0tmfqm40h4cpm6rkr8w04znwvs89geyat4dcv37zffsgj409ray722z9hk'
    },
    {
      name: 'user47',
      type: 'local',
      address: 'tempura10zcrf70ngdpnynhla8e6qy09vhks77ahp3zsrw',
      pubkey: 'tempurapub1addwnpepqgfm0wsj7vaxxh46zd5x7etqj57p6n0pwvw09ch4pvpkct5x8hlx5lmsetw'
    },
    {
      name: 'user48',
      type: 'local',
      address: 'tempura18zlhhklfjf5whr56m3l9fne8uuzhxn5xpnftcn',
      pubkey: 'tempurapub1addwnpepqdlwugghdzjtpc452cpz4nfjvdhqn9vpdrs5yr2p5knq4hdl0mc5jkc0tfl'
    },
    {
      name: 'user49',
      type: 'local',
      address: 'tempura19jl9yewd2awjpy33smzu0rs47ywry9l6hxzcqj',
      pubkey: 'tempurapub1addwnpepqwevfy79js430rl5a0xwtsvpfkrtl5mculpc06xnws768z5mycesu5hkulg'
    },
    {
      name: 'user5',
      type: 'local',
      address: 'tempura1l807knnkv9pn2hh7cm5f28h7xuxh6jm69hdxjh',
      pubkey: 'tempurapub1addwnpepqw45m3a0f52z5wd0xf5q4ez9dzcw84x9rv50cjdac7g78upnxfxzwkl8kna'
    },
    {
      name: 'user50',
      type: 'local',
      address: 'tempura1n8zhamf3tnfpkrg3f323a9zvsuxwdnnwaw6z2e',
      pubkey: 'tempurapub1addwnpepqfqrh9cv94mn33xyz3tjkdmh9pe0hp5rf9a00evxlst0td9kpmk87nqaf09'
    },
    {
      name: 'user51',
      type: 'local',
      address: 'tempura159ysmy53jl0v3vlwdhjxlexg2wgr3awjlv62f2',
      pubkey: 'tempurapub1addwnpepqwvwc7x7rwm5uj7n5gs4r83hkecrn9js82yvhe7pvhll3qx4v5jjccu4kl8'
    },
    {
      name: 'user52',
      type: 'local',
      address: 'tempura1rjn326ajwyctm23vzmhlt6tc3g648r5t4rsg6z',
      pubkey: 'tempurapub1addwnpepqvyateh6z3eu2e2h07l0t97rhd05pzp22nqpzymq6339ycgervufcltykg6'
    },
    {
      name: 'user53',
      type: 'local',
      address: 'tempura167kz6uu2jzvyvxw2927qta6r2knyja5cpden73',
      pubkey: 'tempurapub1addwnpepqwtnpgyfhfdaqrlg0jm9dnlvk2ku9gup8sf2030p78a7v936xlm0z93fpnl'
    },
    {
      name: 'user54',
      type: 'local',
      address: 'tempura1jthg55xu8qatfnd76sa2r8ltqvegc5hkuuawqx',
      pubkey: 'tempurapub1addwnpepqgjpyakqnn9w5uxm6fl4fpxq78fzmhr0dwcwej2k9krz20uqshzdvma33pc'
    },
    {
      name: 'user55',
      type: 'local',
      address: 'tempura1ftak6cy94le4hl4fsy60ltyqgm5uza5w5q64js',
      pubkey: 'tempurapub1addwnpepqvr0rpr445k2d9hlxq2jsuhladsgs30u9x6azgscnnjs7n9zxg5hjkzmgxs'
    },
    {
      name: 'user56',
      type: 'local',
      address: 'tempura1rwpsw7evdnfhfx377w2eyfc49m4kl8wc9q84n4',
      pubkey: 'tempurapub1addwnpepqtmdstqgsjtxvwpgvdqd9xty9lalfgs03dz3axtvfjefkykwguxtqtyeya2'
    },
    {
      name: 'user57',
      type: 'local',
      address: 'tempura1fpgf4s9ldj543vuv6cwe2nh8jl59kc2ld84639',
      pubkey: 'tempurapub1addwnpepqtfv9kd4c88jnxfu8g6nhmmuhj3ehq08jeh36tgl4vh54s65afvwgs32pg9'
    },
    {
      name: 'user58',
      type: 'local',
      address: 'tempura1m3ucwhc8c8wkd2v2555avj48sszaqzemv7j4j7',
      pubkey: 'tempurapub1addwnpepqfjpc4zhelfdq5hcj2h46sr69xzaejm66y6vs5fx79u6r6wkt6hf2hl47ec'
    },
    {
      name: 'user59',
      type: 'local',
      address: 'tempura1ncm64p0exg0te7qxywj9da3z4qpnyx7u9q44nj',
      pubkey: 'tempurapub1addwnpepqfu4lvavs05vs0z6hq9j58smjh8q0zn7ws7y3emtfr4h07337mchverzm3c'
    },
    {
      name: 'user6',
      type: 'local',
      address: 'tempura1vdh00gun5tnr3s8la7ajnr28als4q4g4d7a5ze',
      pubkey: 'tempurapub1addwnpepq2q8vwpskj8jrj346dnjp3cem2kxzuhr5kpscut2hfywvmcyvd0nyzy0rw9'
    },
    {
      name: 'user60',
      type: 'local',
      address: 'tempura1stjcxlrrkr7ql57c4nvd3wx4xzc4zg3m7zypc2',
      pubkey: 'tempurapub1addwnpepq2wll3gtjjvvrl2fdchzq82zxyq57v33lhuqyaw0glrylntwxpfyspgvz6f'
    },
    {
      name: 'user61',
      type: 'local',
      address: 'tempura1fw2uvf7sgwj3kgjscghv55nqfmys0v3fd0eu5m',
      pubkey: 'tempurapub1addwnpepqgudx8hgucqhg28s9n5zz7a487h2wkv46kp37hmqurn7rgy6r8836mp28nc'
    },
    {
      name: 'user62',
      type: 'local',
      address: 'tempura1q5feq3324yc8l5t7yyv2djhmm9ryfw2yad3hls',
      pubkey: 'tempurapub1addwnpepqtpytwzqttvjgcs067kj8guxe3hn7x05zcdavkxadeu6e6x6skfxqnqjw8q'
    },
    {
      name: 'user63',
      type: 'local',
      address: 'tempura1exv2s6p9g2k5k8y2ztwmjl5yf3t5uvpqfq4fah',
      pubkey: 'tempurapub1addwnpepqg6c4r02f25eyfqfgfpw0qkue7unycyqmlpnzn8aglhqugmjpa9y5yw0tx2'
    },
    {
      name: 'user64',
      type: 'local',
      address: 'tempura1r2tfg2zadmdkfujzpa56y6lp4t3aqqs5dxe8qc',
      pubkey: 'tempurapub1addwnpepqwwa0psa0ycrep7zq4qjwlvscuuwv987csxn4puyw8vdj233ld58y2y4tqz'
    },
    {
      name: 'user65',
      type: 'local',
      address: 'tempura1furfkx5wgtra2jx4gf06rng53s9uyvrpeujxnh',
      pubkey: 'tempurapub1addwnpepqgc6en4wvln4ec7mkryh3q3ldz73trvfegjqvg0adsnanv4frr00c99hh24'
    },
    {
      name: 'user66',
      type: 'local',
      address: 'tempura1m8sugrcvmlewe0n7ucryg2dkgf7v72cw3a6har',
      pubkey: 'tempurapub1addwnpepq06urr0zk6n2d78nn8pls0xkrzvc8yzr69dj6x70txm0vrxlv6vu7x00kgy'
    },
    {
      name: 'user67',
      type: 'local',
      address: 'tempura1n7ckuuz00jypalrghljxj8rs20g5qn4pp6yh25',
      pubkey: 'tempurapub1addwnpepq0s28xmcjvq9cpgedmqp6yk3zm3mltn0646l82vfh5m60cmh6u5370xp0qt'
    },
    {
      name: 'user68',
      type: 'local',
      address: 'tempura1udg5rk6szevtlhm46j88vyxxu64gzjmdxgq4qx',
      pubkey: 'tempurapub1addwnpepqfajcdld26fawxwgrea2ez9zzlvv3gxw7hd995swuh8yune57t2myf80w4n'
    },
    {
      name: 'user69',
      type: 'local',
      address: 'tempura1lxsyn54vs7yxft2p8rj26ultefh7wxc479dnd5',
      pubkey: 'tempurapub1addwnpepqfar9x2efqesrw9ys0fg0yeg56rz8rmpghrscd2uzfl79ve7ny7dcz3ausp'
    },
    {
      name: 'user7',
      type: 'local',
      address: 'tempura1zavt63u4t9xekklvkyxmkjmk599d9d6gs0cugq',
      pubkey: 'tempurapub1addwnpepqfev06twj8zfwnl52kecytatptsct0dtrk55cnpvk9raafpgce6kxlcjcmf'
    },
    {
      name: 'user70',
      type: 'local',
      address: 'tempura1pgwn2lgra093rfachvsr77se66ds22t5dl9hpf',
      pubkey: 'tempurapub1addwnpepqf99gad2e4lvau80zm0df2cflutnfukvnguy73f2dja7k4t29n2p7f89gjh'
    },
    {
      name: 'user71',
      type: 'local',
      address: 'tempura1zlq7mlm64l9fh3yrn32q0jxqzuc6n9amc79496',
      pubkey: 'tempurapub1addwnpepqfsmf9ega3vz6agmy2788vdqevttfhtpumafq6vtcaefdl2wdwjxx34ya43'
    },
    {
      name: 'user73',
      type: 'local',
      address: 'tempura14u253xzd5nv8ukjpvzc80ch854ft8fldqmusym',
      pubkey: 'tempurapub1addwnpepqtdgswt4e8tmh7wzgqfrevu5ephft5wjkkf242cr5s0jwnzt5raruyhfcyw'
    },
    {
      name: 'user74',
      type: 'local',
      address: 'tempura1mvg23lr7smx52dxw0qf24v294c6zxhs7vefk0a',
      pubkey: 'tempurapub1addwnpepqfya7ay9mww076fptxkmhtdxse2set4wh7rqaft3p3lmxjphy7n22jfnhzc'
    },
    {
      name: 'user75',
      type: 'local',
      address: 'tempura19ldayq5ukq7kd34lwd2aqgagu300x3uf99t68q',
      pubkey: 'tempurapub1addwnpepqwg7nlznf8se4su4p4xald82f0zsdzytl0d7h8qa62t74q6ddwcvww3hfwd'
    },
    {
      name: 'user76',
      type: 'local',
      address: 'tempura1savtlqtx4pg08lxde2lcpztms6j9dpj9xpd2uc',
      pubkey: 'tempurapub1addwnpepqd249ju8eanptkjafm37pkgrtzxjzju0ktk45762z5y8hsn4h90vgxjmez7'
    },
    {
      name: 'user77',
      type: 'local',
      address: 'tempura1vql0k6rdqvmcy52mka2gpt3fvks7epcztvkqcp',
      pubkey: 'tempurapub1addwnpepqt3w4muunlshttvxrr2r9xf54l38sxm9t8nsp5l4a7wseczn8pf85l7gs9w'
    },
    {
      name: 'user78',
      type: 'local',
      address: 'tempura1tq6xvdzx2nugw5gvtc35nfjpejx6y7wq8hsrvx',
      pubkey: 'tempurapub1addwnpepq0tm3v62f2y06x9gf2dsw5ncxujqpp32jsjcgya6yg7fvdwtnmxgu5em95d'
    },
    {
      name: 'user79',
      type: 'local',
      address: 'tempura15jjetvczt0pn9el8hxd3593l6c2r99px5509qq',
      pubkey: 'tempurapub1addwnpepqtdk64ugwqnhnwgumxffepxxjmxgsxg34tjegrcgne8psputdjxh2n9scq8'
    },
    {
      name: 'user8',
      type: 'local',
      address: 'tempura1eg6cf4vjfsz0uasrz32achsyu867d8gry46qgc',
      pubkey: 'tempurapub1addwnpepqwcap6gduw6hvf34acsrz89umxkfh73q27y2rslm9xaxxjkl3vwc6qkjex3'
    },
    {
      name: 'user80',
      type: 'local',
      address: 'tempura1fl5nu3g793npl6pj3qjuy82lv6c8z4twvtzl8l',
      pubkey: 'tempurapub1addwnpepq0y97wmqhthjyrwuda40ck3psj30jg2ytx5c636p2qew4my445qjjt86fvr'
    },
    {
      name: 'user81',
      type: 'local',
      address: 'tempura1fvvtfx6jyj28af5vea0cl66cmld6cyx4qkkuf9',
      pubkey: 'tempurapub1addwnpepqg7uf3gfhh6ched08rzc9ezx8pzuseqvlsx6j23fhtjx0swamndcqw396tn'
    },
    {
      name: 'user82',
      type: 'local',
      address: 'tempura1pd9zctg0vh2yvzlc3kv8kvlkqa62njpuy2r0f9',
      pubkey: 'tempurapub1addwnpepqgsuusxmvdd6p4fd8wy9fdj8xuhmfqdx4kw3ws7kgrkcl22rm6y67ww2ak8'
    },
    {
      name: 'user83',
      type: 'local',
      address: 'tempura1t4h89qcx2pcd09en083f08rrwg6twnxed9mgs6',
      pubkey: 'tempurapub1addwnpepqfje7zkd3xpjnk7cmdrj6m5gg4w3tkrptjxy20tls90ywd5nym59zxhqqu7'
    },
    {
      name: 'user84',
      type: 'local',
      address: 'tempura1n2k8f4whnkd5jejrnz87v0ts8g5qsgu3fyth24',
      pubkey: 'tempurapub1addwnpepq0vr48nexm3a7eqa3fzpnn7gky6q9d3ckquykkxwapwy8fd3kfrawpwfsyz'
    },
    {
      name: 'user85',
      type: 'local',
      address: 'tempura1wfg5ewvsatymc9lzrz8a3uffv7lr700z4cl0uf',
      pubkey: 'tempurapub1addwnpepqw6pjgcgv6m2g6t7g4ft3vjctsvzuu3q5zd9rvpk3dsg6uah5h0djxjmz2t'
    },
    {
      name: 'user86',
      type: 'local',
      address: 'tempura1p4x4xf5h8tdc9l9h0rcewdukwa6aws58pd5vze',
      pubkey: 'tempurapub1addwnpepqdtt5tjuxtk77ucvkun6ra3vmej97npzekyzcnfank75vlet9ptp52tc6y9'
    },
    {
      name: 'user87',
      type: 'local',
      address: 'tempura17mnk6k5r65nwdlg36hc8he9ques4l5xrcx7tl5',
      pubkey: 'tempurapub1addwnpepqwgtkmvcg6v50saae8j299krlmysgk9rp2rlv970ptwekgv7wh0m2ust5uf'
    },
    {
      name: 'user88',
      type: 'local',
      address: 'tempura1cvhz9355rrnqrew6q6kvcgjaztny0ufav7h6wk',
      pubkey: 'tempurapub1addwnpepq28nqf0haluz3d4nps5pn96ws3syfhr2kt6czr2w29plhelxxqh2xtf8pd5'
    },
    {
      name: 'user89',
      type: 'local',
      address: 'tempura1xfyyazmz7s7fc86avkkjnrzu2na7js9snj0z68',
      pubkey: 'tempurapub1addwnpepqvnsruwx9ph2qt009kaxd589xffng4qeqlj05hecay997h4f42lwxfz898c'
    },
    {
      name: 'user9',
      type: 'local',
      address: 'tempura19jzfnd94y756y6qhylzdcr8wxyqncc7w9wuyyr',
      pubkey: 'tempurapub1addwnpepqteksyl5axlvaupe4scqzeycmv8df69e009vzhpgguuru4l6f7slkmunzd3'
    },
    {
      name: 'user90',
      type: 'local',
      address: 'tempura1cc3k7cq8nqpe0570k0j0hecpeny94gyk8sccs6',
      pubkey: 'tempurapub1addwnpepqgrdxp2ch7ypls8akuazr4h9r3kdnvr904tqhzjpx3rz0q4vwsh26sl7hj5'
    },
    {
      name: 'user91',
      type: 'local',
      address: 'tempura1n3cd8e4vr4tk9w7h5zmx55qcxgv6rl55e6tfez',
      pubkey: 'tempurapub1addwnpepqfzl27xgwpkeksplytz029pxe9lzqzw0vl7hc0yhs57zul0zgjlh7l5gv7p'
    },
    {
      name: 'user92',
      type: 'local',
      address: 'tempura14hvryh7ea0ltyl3g94rxldz59yagwequnuahg7',
      pubkey: 'tempurapub1addwnpepqdpk05s5xq4drr8h9hndqkttmzkj2k2yt2pcz862ntkh2nrej6ccu70ytls'
    },
    {
      name: 'user93',
      type: 'local',
      address: 'tempura1v7q462xdkyhxat77vnpum7cpuxxj4y0gcyq83z',
      pubkey: 'tempurapub1addwnpepqwtepv4zhtuz30fvlxqvhmhltulvx7vy7kcjkxjx6gw2qkkt0w2hznkxu6u'
    },
    {
      name: 'user94',
      type: 'local',
      address: 'tempura1muye5mmj7f8wa7cvsped59fpu8jn462jnvgtvd',
      pubkey: 'tempurapub1addwnpepqfssjcuc94t4vh8mp2tjt58yfp6fy3wshfj9jq46rv4pptyv78n4cu9s280'
    },
    {
      name: 'user95',
      type: 'local',
      address: 'tempura1tydq3g0hfv7qn4l5pkllzrc4z9xxkp0ymhject',
      pubkey: 'tempurapub1addwnpepq2c7ptze0p9crlws9zp2kwwth2gk60940lqvjepd6uzefnwxlzh6vr5g9t0'
    },
    {
      name: 'user96',
      type: 'local',
      address: 'tempura1xx9d9cekm6888r6rcnfxlpkjjegklppyn5kl6z',
      pubkey: 'tempurapub1addwnpepq0gm34wrzf29ezjmr60z53c88kcttygpncclcftqzt4w5aluvjfjwksm5t4'
    },
    {
      name: 'user97',
      type: 'local',
      address: 'tempura1kyed2zmm367zlpmk73f5kzlf62ka4qzuf563el',
      pubkey: 'tempurapub1addwnpepqv02pnqtvh8drdnchsszlveeemlcpklpaku2hy0yyv9ek2pw9t9t7e66tpc'
    },
    {
      name: 'user98',
      type: 'local',
      address: 'tempura143vd4pgt84duz9lqegpkftd3cszpylgrua24cr',
      pubkey: 'tempurapub1addwnpepqdgjh6v2pw9q7sxvhw69g4y240grd86mgpzn7t6lky02juzlkseq63awuyn'
    },
    {
      name: 'user99',
      type: 'local',
      address: 'tempura1asusvtn9wswr42rqa2sfzetgq8f4mzs563w4jz',
      pubkey: 'tempurapub1addwnpepqg0qnatks8gh23u7nkt6jhr74sher2le3xsx5j5zwps4h2frajkr2rhmssn'
    }
  ]

  test('send from 1 > n', async () => {
    const valKey = await keystore.get(db, 'chai', '12345678')

    // query account for account_number and sequence
    const account = await client.queryAccount('http://localhost:1317', valKey.address)

    const { value: tx } = generateStdTx(
      testAccounts
        .filter(acc => acc.name.startsWith('user'))
        .map(acc => generateSend('10000', valKey.address, acc.address)),
      { gas: '5000000', amount: [] },
      ''
    )
    const signature = await transaction.sign(null, valKey, tx, {
      chain_id: 'testing',
      account_number: account.account_number,
      sequence: account.sequence
    })

    transaction.assignSignature(tx, signature)
    const body = transaction.createBroadcastBody(tx)

    const height = await client.broadcast('http://localhost:1317', account, body)

    expect(height).toBeGreaterThan(0)
  }, 15000)
})
