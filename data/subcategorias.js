export const SUBCATEGORIAS = [
  { id:'barreira', nome:'Barreira', pvLimitDelta:3, pvCurrentDelta:1,
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:2}},
    requisitos:['Necessita de pelo menos 1 restrição para ser ativada.'] },

  { id:'ofensivo', nome:'Ofensivo', pvLimitSetTo:10, capPVMax:10,
    slots:{comum:{grantLevels:[1,3,6,9,12,16,20]}, auxiliar:{base:3, grantLevels:[1,6,12], capTotal:3}},
    regras:{reduzPAOfensivasPorGrau:'metade_arred_baixo'} },

  { id:'colaborativo', nome:'Colaborativo', pvLimitDelta:4, pvCurrentDelta:4,
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:2}},
    requisitos:['Necessita de uma restrição adicional além de “precisa de outra criatura”.'] },

  { id:'amplificador', nome:'Amplificador', pvLimitMax:10,
    regras:{herdaLimiteDaPrimaria:true, recebePVPorRequisito:[{manif:1, pv:2},{manif:2, pv:3}],
            recebeTecnicasSePrimariaNaoForOfensiva:{comum:2,auxiliar:2}} },

  { id:'defensivo', nome:'Defensivo', pvLimitDelta:3,
    regras:{naoCausaDanoDireto:true, reduz2SeNaoCausarDano:true},
    slots:{comum:{base:1, extraTreino:2}, auxiliar:{base:3}} },

  { id:'contra_ativacao', nome:'Contra-Ativação',
    regras:{gatilhos:[{id:'comum', pv:2},{id:'metade_vida', pv:4},{id:'morte', pv:6}], usaAtivacaoPunitiva:true},
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:2}} },

  { id:'roubo', nome:'Roubo', regras:{pvFlexPorEfeito:true, restricoesMin:5, proibeMemoriaCheia:true, rouboPermanenteReducaoMin:14},
    slots:{comum:{base:0}, auxiliar:{base:0}} },

  { id:'mina_terrestre', nome:'Mina Terrestre', pvLimitDelta:1, pvCurrentDelta:1,
    regras:{duracaoEspecialPermitida:true}, slots:{comum:{base:2}, auxiliar:{base:2}} },

  { id:'roubo_temporario', nome:'Roubo Temporário', regras:{pvFlexPorEfeito:true, restricoesMin:3, reducaoMinTotal:8},
    slots:{comum:{base:0}, auxiliar:{base:2}} },

  { id:'composto', nome:'Composto', pvLimitDelta:2, pvCurrentDelta:2,
    regras:{custoAtivar1PA:true, maxAuxiliares:5, caminhosMultiSubcats:true},
    slots:{comum:{base:0}, auxiliar:{base:0}} },

  { id:'exorcismo', nome:'Exorcismo', pvLimitIgualRestricoes:true, pvCurrentDelta:2,
    slots:{comum:{base:2}, auxiliar:{base:2}} },

  { id:'suporte', nome:'Suporte', pvLimitDelta:2,
    regras:{naoOfensivo:true, reducaoNaoOfensivaPorFaixa:[{ate:6, reducao:2},{de:9,ate:15,reducao:3}]},
    slots:{comum:{base:1, extraTreino:3}, auxiliar:{base:5}} },

  { id:'contratual', nome:'Contratual',
    regras:{limiteSomaRestricoes:true, restricoesMin:3, reducaoMinTotal:6},
    slots:{comum:{base:0}, auxiliar:{base:2}} },

  { id:'maldicao', nome:'Maldição', pvLimitDelta:4, pvCurrentDelta:4,
    regras:{restricoesMin:2, exorcismoRemove:true, naoPodeTreinarExtras:true},
    slots:{comum:{base:2}, auxiliar:{base:2}} },

  { id:'taxa_difusiva', nome:'Taxa Difusiva', pvLimitDelta:2,
    regras:{restricoesMin:3, naoPodeTreinarExtras:true},
    slots:{comum:{base:1}, auxiliar:{base:1}} },

  { id:'emprestimo', nome:'Empréstimo',
    regras:{pvFlexPorEfeito:true, restricoesMin:2, reducaoMinTotal:3, naoPodeTreinarExtras:true},
    slots:{comum:{base:0}, auxiliar:{base:2}} },

  { id:'besta_de_nen', nome:'Besta de Nen',
    regras:{reduzCriarLacaioMetade:true, reduzGerarCriaturaMetade:true, geracaoUnica:true,
            bonusSeNaoForLacaio:{pvLimitDelta:2,pvCurrentDelta:2,imortal: true, subcatSecundariaSemBonus:true}},
    slots:{comum:{base:3, extraTreino:2}, auxiliar:{base:2}} },

  { id:'assombracao', nome:'Assombração', pvLimitDelta:4, pvCurrentDelta:4,
    regras:{restricoesMin:3, reducaoMinTotal:6, naoPodeTreinarExtras:true},
    slots:{comum:{base:1}, auxiliar:{base:1}} },

  { id:'parasita', nome:'Parasita', pvLimitDelta:4,
    regras:{metadeCustoGerarCriatura:true, consomePAaCada6h:true, restricoesMin:2, reducaoMinTotal:3, naoPodeTreinarExtras:true},
    slots:{comum:{base:1}, auxiliar:{base:1}} },

  { id:'simbiotico', nome:'Simbiótico',
    regras:{limiteSomaRestricoes:true, restricoesMin:2, reducaoMinTotal:3, naoPodeTreinarExtras:true},
    slots:{comum:{base:0}, auxiliar:{base:3}} },

  { id:'clonagem', nome:'Clonagem',
    regras:{clonePerfeitoMenos4:true, danoComCloneMenos1:true},
    slots:{comum:{base:3, extraTreino:3}, auxiliar:{base:2}} },

  { id:'manipulativo', nome:'Manipulativo',
    pvLimitDelta:2, pvCurrentDelta:1,
    regras:{exigeAlvoNaoConjurado:true, reduzCustoUsandoAlvo:1},
    slots:{comum:{base:3, extraTreino:1}, auxiliar:{base:3}} },

  { id:'manipulacao_coercitiva', nome:'Manipulação Coercitiva',
    regras:{dominarCriaturaFlexPV:true, restricoesMinPA:10},
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:2}} },

  { id:'manipulacao_pseudo_coercitiva', nome:'Manipulação Pseudo-Coercitiva',
    pvLimitDelta:2, regras:{restricoesMin:2},
    slots:{comum:{base:1, extraTreino:2}, auxiliar:{base:3}} },

  { id:'manipulacao_solícita', nome:'Manipulação Solícita',
    pvLimitDelta:2, regras:{restricoesMin:1},
    slots:{comum:{base:1, extraTreino:2}, auxiliar:{base:3}} },

  { id:'sacrificial', nome:'Sacrificial',
    pvLimitDelta:2, pvCurrentDelta:2,
    regras:{limiteDinamicoPorSacrificio:true, restricoesMin:1},
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:3}} },

  { id:'especializado', nome:'Especializado', pvLimitDelta:2,
    regras:{restricoesMin:1, excederEmCasoExtremo:true},
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:2}} },

  { id:'criacao', nome:'Criação', pvLimitDelta:3, pvCurrentDelta:1,
    regras:{restricoesMin:1, custoNaoOfensivoMenos1:true},
    slots:{comum:{base:2, extraTreino:3}, auxiliar:{base:2}} },

  { id:'sensorial', nome:'Sensorial', pvLimitDelta:3, pvCurrentDelta:2,
    regras:{restricoesMin:1, alcanceTriplo:true, recebeBonusDoEn:true},
    slots:{comum:{base:2}, auxiliar:{base:3}} },

  { id:'condicional', nome:'Condicional', pvLimitDelta:2,
    regras:{restricoesMin:1, reduzTecnicas2Min1:true},
    slots:{comum:{base:2, extraTreino:2}, auxiliar:{base:2}} },

  { id:'limitador', nome:'Limitador', pvLimitDelta:3,
    regras:{efeitosDeOfensivoNoAmplificador:true},
    slots:{comum:{base:0}, auxiliar:{base:0}} },
];