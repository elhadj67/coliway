export type LegalType = 'cgu' | 'confidentialite' | 'mentions';

export interface LegalSection {
  heading: string;
  content: string;
}

export interface LegalDocument {
  title: string;
  sections: LegalSection[];
}

export const LEGAL_CONTENT: Record<LegalType, LegalDocument> = {
  cgu: {
    title: "Conditions Generales d'Utilisation",
    sections: [
      {
        heading: 'COLIWAY SAS',
        content:
          "Plateforme de mise en relation pour la livraison de colis\n\nDate d'entree en vigueur : 1er mars 2026\nDerniere mise a jour : 1er mars 2026",
      },
      {
        heading: 'Preambule',
        content:
          "Les presentes Conditions Generales d'Utilisation (ci-apres \"CGU\") regissent l'acces et l'utilisation de la plateforme Coliway, accessible via l'application mobile et le site internet www.coliway.fr (ci-apres \"la Plateforme\"), editee par la societe COLIWAY SAS.\n\nToute utilisation de la Plateforme implique l'acceptation sans reserve des presentes CGU. En cas de desaccord avec l'une quelconque des dispositions des presentes, l'utilisateur est invite a ne pas utiliser la Plateforme.",
      },
      {
        heading: 'Article 1 -- Objet',
        content:
          "Les presentes CGU ont pour objet de definir les conditions et modalites d'utilisation de la Plateforme Coliway.\n\nColiway est une plateforme numerique de mise en relation entre :\n- des particuliers ou professionnels souhaitant faire livrer des colis (ci-apres \"Clients\") ;\n- et des livreurs independants disposant d'un vehicule et d'un statut professionnel adequat (ci-apres \"Livreurs\").\n\nColiway agit exclusivement en qualite d'intermediaire technique. La Plateforme facilite la mise en relation entre Clients et Livreurs mais n'est pas partie au contrat de transport qui lie directement le Client et le Livreur. Coliway n'est ni transporteur, ni commissionnaire de transport.",
      },
      {
        heading: 'Article 2 -- Definitions',
        content:
          "- Plateforme : designe l'application mobile Coliway (disponible sur iOS et Android) ainsi que le site internet www.coliway.fr, permettant la mise en relation entre Clients et Livreurs.\n\n- Utilisateur : designe toute personne physique ou morale qui accede a la Plateforme et/ou utilise les services proposes, qu'il soit Client ou Livreur.\n\n- Client : designe toute personne physique ou morale inscrite sur la Plateforme en qualite d'expediteur, souhaitant faire livrer un ou plusieurs Colis.\n\n- Livreur : designe toute personne physique inscrite sur la Plateforme en qualite de prestataire de livraison, exercant sous le statut d'auto-entrepreneur ou toute autre forme juridique compatible, et disposant des autorisations necessaires pour effectuer du transport de marchandises.\n\n- Colis : designe tout objet, paquet ou marchandise confie par un Client a un Livreur en vue de sa livraison, dans le respect des conditions definies par les presentes CGU.\n\n- Course : designe une mission de livraison d'un ou plusieurs Colis, comprenant l'enlevement au point de depart et la remise au point de destination.\n\n- Compte Utilisateur : designe l'espace personnel cree par l'Utilisateur lors de son inscription sur la Plateforme, accessible au moyen de ses identifiants de connexion.\n\n- Commission : designe le pourcentage preleve par Coliway sur le montant de chaque Course, en remuneration de ses services d'intermediation.\n\n- Services : designe l'ensemble des fonctionnalites proposees par la Plateforme, incluant la mise en relation, le suivi en temps reel, le paiement securise et la gestion des livraisons.",
      },
      {
        heading: 'Article 3 -- Inscription et creation de compte',
        content:
          "3.1 Conditions d'inscription\nL'inscription sur la Plateforme est ouverte a toute personne physique agee d'au moins 18 ans et disposant de la pleine capacite juridique, ainsi qu'a toute personne morale regulierement constituee. L'inscription est gratuite et obligatoire pour acceder aux Services de la Plateforme.\n\n3.2 Procedure d'inscription -- Client\nPour s'inscrire en qualite de Client, l'Utilisateur doit :\n- fournir son nom, prenom, adresse email valide et numero de telephone ;\n- creer un mot de passe securise ;\n- accepter les presentes CGU ainsi que la Politique de Confidentialite ;\n- verifier son adresse email et/ou son numero de telephone par le mecanisme de validation fourni.\n\n3.3 Procedure d'inscription -- Livreur\nPour s'inscrire en qualite de Livreur, l'Utilisateur doit :\n- fournir son nom, prenom, adresse email valide et numero de telephone ;\n- justifier de son statut d'auto-entrepreneur ou de toute autre forme juridique compatible, en fournissant son numero SIRET ;\n- fournir une copie de son permis de conduire en cours de validite (categorie B minimum) ;\n- fournir une attestation d'assurance responsabilite civile professionnelle en cours de validite ;\n- fournir une attestation d'assurance du vehicule utilise pour les livraisons ;\n- fournir les informations relatives a son vehicule (type, immatriculation) ;\n- creer un mot de passe securise ;\n- accepter les presentes CGU, la Politique de Confidentialite et la Charte du Livreur.\n\nL'inscription du Livreur est soumise a validation par les equipes de Coliway apres verification des documents fournis. Coliway se reserve le droit de refuser toute inscription sans avoir a en justifier la raison.\n\n3.4 Exactitude des informations\nL'Utilisateur s'engage a fournir des informations exactes, completes et a jour lors de son inscription et tout au long de l'utilisation de la Plateforme.\n\n3.5 Securite du compte\nL'Utilisateur est seul responsable de la confidentialite de ses identifiants de connexion. En cas de suspicion d'utilisation non autorisee de son compte, l'Utilisateur doit en informer Coliway immediatement a l'adresse support@coliway.fr.",
      },
      {
        heading: 'Article 4 -- Obligations du Client',
        content:
          "4.1 Informations exactes\nLe Client s'engage a fournir des informations exactes et completes lors de la creation d'une Course, notamment :\n- l'adresse precise d'enlevement et de livraison ;\n- la description fidele du Colis (nature, dimensions, poids approximatif) ;\n- les coordonnees du destinataire ;\n- toute instruction particuliere necessaire a la bonne execution de la livraison.\n\n4.2 Emballage et conditionnement\nLe Client est responsable de l'emballage et du conditionnement adequat du Colis. Le Colis doit etre emballe de maniere a supporter les conditions normales de transport. Coliway et le Livreur declinent toute responsabilite en cas de dommage resultant d'un emballage insuffisant ou defectueux.\n\n4.3 Objets interdits\nIl est strictement interdit de confier au Livreur les objets suivants :\n- matieres dangereuses, inflammables, explosives, corrosives ou toxiques ;\n- substances illicites ou stupefiants ;\n- armes et munitions ;\n- animaux vivants ;\n- denrees perissables (sauf accord prealable explicite du Livreur) ;\n- objets dont le transport est interdit par la legislation francaise ou europeenne en vigueur ;\n- billets de banque, monnaie, metaux precieux, pierres precieuses ;\n- documents d'identite originaux ;\n- tout objet dont la valeur declaree excede 5 000 euros.\n\n4.4 Paiement\nLe Client s'engage a proceder au paiement de la Course selon les modalites definies dans les Conditions Generales de Vente (CGV). Le paiement est exigible au moment de la validation de la commande.\n\n4.5 Disponibilite\nLe Client ou le destinataire designe s'engage a etre disponible pour receptionner le Colis au lieu et au creneaux horaires convenus.",
      },
      {
        heading: 'Article 5 -- Obligations du Livreur',
        content:
          "5.1 Statut juridique\nLe Livreur exerce son activite sous le statut d'auto-entrepreneur (micro-entreprise) ou sous toute autre forme juridique compatible. Le Livreur est un prestataire independant et n'est lie a Coliway par aucun lien de subordination.\n\n5.2 Permis de conduire et documents\nLe Livreur doit etre titulaire d'un permis de conduire en cours de validite (categorie B minimum) et s'engage a informer Coliway de toute suspension, annulation ou restriction de son permis.\n\n5.3 Assurance\nLe Livreur doit disposer :\n- d'une assurance responsabilite civile professionnelle (RC Pro) en cours de validite ;\n- d'une assurance automobile couvrant l'usage professionnel du vehicule utilise pour les livraisons.\n\n5.4 Etat du vehicule\nLe Livreur s'engage a utiliser un vehicule en bon etat de fonctionnement, conforme aux normes de securite en vigueur et regulierement entretenu.\n\n5.5 Professionnalisme et qualite de service\nLe Livreur s'engage a :\n- effectuer les livraisons avec diligence et dans les delais convenus ;\n- manipuler les Colis avec soin et precaution ;\n- adopter un comportement courtois et professionnel ;\n- respecter le Code de la route ;\n- assurer la confidentialite des informations relatives aux Colis ;\n- confirmer l'enlevement et la livraison du Colis via la Plateforme.\n\n5.6 Capacite de transport\nLe cas echeant, le Livreur doit disposer des autorisations et capacites de transport requises par la reglementation francaise.",
      },
      {
        heading: 'Article 6 -- Fonctionnement du Service',
        content:
          "6.1 Creation d'une commande\nLe Client cree une Course en renseignant sur la Plateforme :\n- l'adresse d'enlevement ;\n- l'adresse de livraison ;\n- la description du Colis (type, dimensions, poids) ;\n- le creneau horaire souhaite ;\n- toute instruction complementaire.\n\n6.2 Mise en relation et acceptation\nUne fois la Course creee et le paiement valide, la demande est transmise aux Livreurs disponibles dans la zone geographique concernee. Le Livreur est libre d'accepter ou de refuser une Course.\n\n6.3 Suivi en temps reel\nLa Plateforme permet au Client de suivre en temps reel l'avancement de la Course, depuis l'acceptation par le Livreur jusqu'a la confirmation de livraison.\n\n6.4 Confirmation de livraison\nLa livraison est confirmee par :\n- la validation sur la Plateforme par le Livreur ;\n- la signature electronique ou la confirmation du destinataire ;\n- la prise de photo du Colis livre (si applicable).\n\n6.5 Evaluation\nA l'issue de chaque Course, le Client et le Livreur sont invites a s'evaluer mutuellement via un systeme de notation (de 1 a 5 etoiles) et de commentaires.",
      },
      {
        heading: 'Article 7 -- Prix et Paiement',
        content:
          "7.1 Calcul du prix\nLe prix de chaque Course est calcule par la Plateforme en fonction de plusieurs criteres :\n- la distance entre le point d'enlevement et le point de livraison ;\n- le type et les dimensions du Colis ;\n- le poids du Colis ;\n- le creneau horaire demande ;\n- les conditions de marche (offre et demande).\n\nLe prix est communique au Client avant la validation de la commande.\n\n7.2 Commission Coliway\nColiway preleve une commission sur le montant total de chaque Course en remuneration de ses services d'intermediation.\n\n7.3 Moyens de paiement\nLe paiement s'effectue exclusivement via la Plateforme par les moyens suivants :\n- carte bancaire (Visa, Mastercard, American Express) via le prestataire de paiement Stripe ;\n- PayPal.\n\nLe paiement en especes ou par tout autre moyen non prevu par la Plateforme est strictement interdit.\n\n7.4 Securite des paiements\nLes transactions de paiement sont securisees par les prestataires Stripe et PayPal, certifies PCI-DSS. Coliway ne stocke aucune donnee bancaire sur ses serveurs.\n\n7.5 Versement aux Livreurs\nLe montant de la Course, deduction faite de la commission Coliway, est verse au Livreur selon les modalites definies dans les CGV.",
      },
      {
        heading: 'Article 8 -- Annulation et Remboursement',
        content:
          "8.1 Annulation par le Client\n- Annulation gratuite : si la Course est annulee avant l'acceptation par un Livreur, aucun frais n'est facture.\n- Annulation avec frais reduits : si la Course est annulee apres l'acceptation par un Livreur mais avant l'enlevement du Colis, des frais d'annulation de 5 euros seront retenus.\n- Annulation apres enlevement : le montant total de la Course reste du et des frais de retour du Colis pourront etre factures.\n\n8.2 Annulation par le Livreur\nLe Livreur peut annuler une Course qu'il a acceptee uniquement en cas de force majeure. Les annulations repetees pourront entrainer une suspension du compte.\n\n8.3 Remboursement\nLes remboursements sont effectues par le meme moyen de paiement que celui utilise lors de la commande, dans un delai de 5 a 10 jours ouvrables.",
      },
      {
        heading: 'Article 9 -- Responsabilite',
        content:
          "9.1 Role d'intermediaire\nColiway agit en qualite d'intermediaire technique mettant en relation des Clients et des Livreurs independants.\n\n9.2 Limitation de responsabilite de Coliway\nColiway ne saurait etre tenue responsable :\n- des dommages causes aux Colis pendant le transport ;\n- des retards de livraison lies a des circonstances independantes de sa volonte ;\n- des agissements des Utilisateurs contraires aux presentes CGU ;\n- de l'inexactitude des informations fournies par les Utilisateurs ;\n- des interruptions temporaires de la Plateforme pour maintenance ;\n- des dysfonctionnements lies aux reseaux de telecommunication.\n\n9.3 Disponibilite de la Plateforme\nColiway s'efforce d'assurer la disponibilite de la Plateforme 24h/24, 7j/7.\n\n9.4 Assurance\nColiway recommande aux Clients de souscrire une assurance adaptee pour les Colis de valeur.\n\n9.5 Force majeure\nColiway ne pourra etre tenue responsable en cas de force majeure telle que definie par l'article 1218 du Code civil.",
      },
      {
        heading: 'Article 10 -- Propriete Intellectuelle',
        content:
          "La Plateforme, incluant sa structure, son design, ses interfaces, ses logiciels, ses bases de donnees, ses textes, images, graphismes, logos, icones, sons et tout autre element la composant, est la propriete exclusive de COLIWAY SAS.\n\nLa marque \"Coliway\", le logo et l'ensemble des signes distinctifs associes sont la propriete exclusive de COLIWAY SAS.\n\nToute reproduction, representation, modification, adaptation, traduction, distribution ou exploitation sans autorisation prealable et ecrite est strictement interdite.",
      },
      {
        heading: 'Article 11 -- Donnees Personnelles',
        content:
          "Dans le cadre de l'utilisation de la Plateforme, Coliway est amenee a collecter et traiter des donnees a caractere personnel des Utilisateurs.\n\nLes conditions de collecte, de traitement et de protection des donnees personnelles sont detaillees dans la Politique de Confidentialite.\n\nConformement au RGPD et a la loi Informatique et Libertes, les Utilisateurs disposent de droits sur leurs donnees personnelles.",
      },
      {
        heading: 'Article 12 -- Resiliation',
        content:
          "12.1 Resiliation par l'Utilisateur\nTout Utilisateur peut demander la suppression de son Compte Utilisateur a support@coliway.fr ou depuis les parametres de son compte. La suppression sera effective dans un delai de 30 jours.\n\n12.2 Suspension et resiliation par Coliway\nColiway se reserve le droit de suspendre ou resilier le Compte en cas de :\n- violation des CGU ;\n- fourniture d'informations fausses ;\n- comportement frauduleux ou abusif ;\n- notation moyenne inferieure a 3/5 (pour les Livreurs) ;\n- non-paiement ou paiement conteste ;\n- inactivite superieure a 12 mois ;\n- demande d'une autorite competente.",
      },
      {
        heading: 'Article 13 -- Litiges',
        content:
          "13.1 Reclamation\nEn cas de litige, l'Utilisateur est invite a adresser sa reclamation a support@coliway.fr. Coliway s'engage a accuser reception dans un delai de 48 heures.\n\n13.2 Mediation\nConformement au Code de la consommation, le Client consommateur peut recourir gratuitement au service de mediation propose par Coliway.\n\nLe Client peut egalement deposer sa reclamation sur la plateforme europeenne de reglement en ligne des litiges : https://ec.europa.eu/consumers/odr\n\n13.3 Juridiction competente\nA defaut de resolution amiable, tout litige sera soumis aux tribunaux competents de Paris.",
      },
      {
        heading: 'Articles 14 & 15 -- Modification des CGU et Droit applicable',
        content:
          "Coliway se reserve le droit de modifier les presentes CGU a tout moment. Les modifications entrent en vigueur 30 jours apres leur notification aux Utilisateurs.\n\nLes presentes CGU sont soumises au droit francais. Elles sont redigees en langue francaise.\n\nCOLIWAY SAS\nSociete par Actions Simplifiee au capital de 10 000 euros\nSiege social : 15 Rue de la Paix, 75002 Paris, France\nEmail : contact@coliway.fr\n\nLes presentes Conditions Generales d'Utilisation sont entrees en vigueur le 1er mars 2026.",
      },
    ],
  },

  confidentialite: {
    title: 'Politique de Confidentialite',
    sections: [
      {
        heading: 'COLIWAY SAS',
        content:
          "Plateforme de mise en relation pour la livraison de colis\n\nDate d'entree en vigueur : 1er mars 2026\nDerniere mise a jour : 1er mars 2026",
      },
      {
        heading: 'Preambule',
        content:
          "La presente Politique de Confidentialite a pour objet d'informer les utilisateurs de la plateforme Coliway des conditions dans lesquelles leurs donnees a caractere personnel sont collectees, traitees et protegees.\n\nCOLIWAY SAS s'engage a respecter la vie privee de ses utilisateurs et a proteger leurs donnees personnelles conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi n. 78-17 du 6 janvier 1978 relative a l'informatique, aux fichiers et aux libertes.\n\nLa presente Politique de Confidentialite fait partie integrante des Conditions Generales d'Utilisation (CGU) de la Plateforme.",
      },
      {
        heading: '1. Responsable du traitement',
        content:
          'Le responsable du traitement des donnees personnelles collectees via la Plateforme est :\n\nCOLIWAY SAS\nSociete par Actions Simplifiee au capital de 10 000 euros\nSiege social : 15 Rue de la Paix, 75002 Paris, France\nEmail : contact@coliway.fr\nTelephone : +33 1 XX XX XX XX\n\nDelegue a la Protection des Donnees (DPO) :\nEmail : dpo@coliway.fr\nAdresse postale : COLIWAY SAS -- DPO, 15 Rue de la Paix, 75002 Paris, France',
      },
      {
        heading: '2. Donnees collectees',
        content:
          "2.1 Donnees d'identite et de contact\n- Nom et prenom\n- Adresse email\n- Numero de telephone\n- Adresse postale\n- Photo de profil (facultatif)\n\n2.2 Donnees d'identification professionnelle (Livreurs)\n- Numero SIRET\n- Copie du permis de conduire\n- Attestation d'assurance responsabilite civile professionnelle\n- Attestation d'assurance vehicule\n- Informations relatives au vehicule (type, immatriculation)\n- RIB / coordonnees bancaires pour les versements\n\n2.3 Donnees de paiement\n- Informations de carte bancaire (traitees et stockees exclusivement par Stripe, non conservees par Coliway)\n- Identifiant de compte PayPal\n- Historique des transactions\n\n2.4 Donnees de localisation\n- Position geographique en temps reel (durant les Courses, pour les Livreurs)\n- Adresses d'enlevement et de livraison\n- Historique des trajets\n\n2.5 Donnees d'utilisation de la Plateforme\n- Identifiant unique d'utilisateur\n- Date et heure de connexion\n- Pages consultees et fonctionnalites utilisees\n- Type et version de l'appareil et du systeme d'exploitation\n- Adresse IP\n- Donnees de navigation (cookies, journaux de connexion)\n\n2.6 Donnees de communication\n- Echanges avec le service client\n- Messages echanges entre Client et Livreur via la messagerie integree\n- Evaluations et commentaires",
      },
      {
        heading: '3. Finalites du traitement',
        content:
          "3.1 Execution du service\n- Creation et gestion des comptes utilisateurs\n- Mise en relation entre Clients et Livreurs\n- Traitement et suivi des commandes de livraison\n- Geolocalisation en temps reel pour le suivi des Courses\n- Gestion des evaluations et des notations\n\n3.2 Paiement et facturation\n- Traitement securise des paiements (via Stripe et PayPal)\n- Generation des factures electroniques\n- Versement des remunerations aux Livreurs\n- Gestion comptable et fiscale\n\n3.3 Securite et prevention de la fraude\n- Verification de l'identite des utilisateurs\n- Detection et prevention des fraudes\n- Securisation des transactions\n- Gestion des litiges et des reclamations\n\n3.4 Amelioration du service\n- Analyse statistique de l'utilisation de la Plateforme\n- Amelioration de l'experience utilisateur\n- Developpement de nouvelles fonctionnalites\n\n3.5 Communication\n- Envoi de notifications relatives aux Courses\n- Communication du service client\n- Envoi d'informations relatives aux modifications des CGU ou de la presente Politique\n- Envoi de communications commerciales (avec consentement prealable)",
      },
      {
        heading: '4. Base legale des traitements',
        content:
          "Chaque traitement de donnees personnelles repose sur une base legale conforme au RGPD :\n\n- Execution du service : Execution du contrat (article 6.1.b)\n- Paiement et facturation : Execution du contrat et obligation legale (articles 6.1.b et 6.1.c)\n- Securite et prevention de la fraude : Interet legitime (article 6.1.f)\n- Amelioration du service : Interet legitime (article 6.1.f)\n- Communications commerciales : Consentement de l'utilisateur (article 6.1.a)\n- Obligations comptables et fiscales : Obligation legale (article 6.1.c)\n- Geolocalisation en temps reel : Execution du contrat (article 6.1.b)",
      },
      {
        heading: '5. Duree de conservation des donnees',
        content:
          "- Donnees du compte utilisateur : Pendant la duree de l'inscription + 3 ans apres la suppression\n- Donnees de paiement et de facturation : 10 ans a compter de la transaction\n- Donnees de localisation (trajets) : 1 an a compter de la Course\n- Journaux de connexion (logs) : 1 an\n- Donnees de communication : 3 ans a compter du dernier echange\n- Cookies et donnees de navigation : 13 mois maximum\n- Documents d'identite et justificatifs (Livreurs) : Pendant la duree de l'inscription + 5 ans\n- Donnees relatives aux litiges : Jusqu'a resolution definitive + delai de prescription\n\nA l'expiration des durees de conservation, les donnees sont supprimees ou anonymisees de maniere irreversible.",
      },
      {
        heading: '6. Destinataires des donnees',
        content:
          "6.1 Sous-traitants et prestataires techniques\n- Stripe : traitement des paiements par carte bancaire\n- PayPal : traitement des paiements PayPal\n- Google Cloud Platform / Firebase : hebergement, stockage, authentification, notifications push\n- Google Maps Platform : services de cartographie et de geolocalisation\n- Prestataire d'envoi d'emails : notifications transactionnelles\n\n6.2 Autres utilisateurs\n- Les Clients ont acces au prenom, a la photo de profil et a la notation du Livreur\n- Les Livreurs ont acces au prenom du Client et aux adresses d'enlevement et de livraison\n\n6.3 Autorites competentes\nLes donnees peuvent etre communiquees aux autorites judiciaires, administratives ou fiscales sur demande legitime.",
      },
      {
        heading: '7. Transferts de donnees hors de l\'Union Europeenne',
        content:
          "Certains de nos sous-traitants, notamment Firebase / Google Cloud Platform, peuvent traiter des donnees en dehors de l'Union Europeenne, et notamment aux Etats-Unis.\n\nDes garanties appropriees sont mises en place :\n- Decisions d'adequation de la Commission Europeenne ;\n- Clauses Contractuelles Types (CCT) ;\n- Data Privacy Framework (DPF) UE-Etats-Unis.\n\nGoogle LLC est certifie au titre du Data Privacy Framework UE-Etats-Unis.",
      },
      {
        heading: '8. Droits des utilisateurs',
        content:
          "Conformement au RGPD et a la loi Informatique et Libertes, tout utilisateur dispose des droits suivants :\n\n- Droit d'acces (article 15 du RGPD)\n- Droit de rectification (article 16 du RGPD)\n- Droit a l'effacement (article 17 du RGPD)\n- Droit a la portabilite (article 20 du RGPD)\n- Droit d'opposition (article 21 du RGPD)\n- Droit a la limitation du traitement (article 18 du RGPD)\n- Droit de definir des directives relatives au sort de vos donnees apres votre deces\n\nPour exercer vos droits :\n- Email au DPO : dpo@coliway.fr\n- Courrier postal : COLIWAY SAS -- DPO, 15 Rue de la Paix, 75002 Paris, France\n- Via les parametres de votre compte sur la Plateforme\n\nDelai de reponse : un mois a compter de la reception.\n\nReclamation aupres de la CNIL :\nCNIL - 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07\nSite internet : www.cnil.fr",
      },
      {
        heading: '9. Cookies',
        content:
          "La Plateforme utilise des cookies et des technologies similaires. Pour plus d'informations, consultez notre Politique de Cookies.",
      },
      {
        heading: '10. Securite des donnees',
        content:
          "Coliway met en oeuvre des mesures techniques et organisationnelles appropriees pour proteger les donnees personnelles, notamment :\n- chiffrement des donnees en transit (TLS/SSL) et au repos ;\n- authentification forte et gestion des acces ;\n- sauvegardes regulieres et securisees ;\n- surveillance et journalisation des acces ;\n- sensibilisation et formation du personnel ;\n- evaluation reguliere de la securite (tests d'intrusion, audits).",
      },
      {
        heading: '11 & 12. Modification et Contact',
        content:
          "Coliway se reserve le droit de modifier la presente Politique de Confidentialite a tout moment. Toute modification substantielle sera notifiee au moins 30 jours avant son entree en vigueur.\n\nPour toute question :\n\nDelegue a la Protection des Donnees (DPO)\nEmail : dpo@coliway.fr\nAdresse postale : COLIWAY SAS -- DPO, 15 Rue de la Paix, 75002 Paris, France\n\nService client\nEmail : support@coliway.fr\nTelephone : +33 1 XX XX XX XX\n\nLa presente Politique de Confidentialite est entree en vigueur le 1er mars 2026.",
      },
    ],
  },

  mentions: {
    title: 'Mentions Legales',
    sections: [
      {
        heading: 'Application Coliway',
        content: 'Date de mise a jour : 1er mars 2026',
      },
      {
        heading: "1. Editeur du site et de l'application",
        content:
          "Le site internet www.coliway.fr et l'application mobile Coliway sont edites par :\n\nCOLIWAY SAS\nSociete par Actions Simplifiee au capital de 10 000 euros\nSiege social : 15 Rue de la Paix, 75002 Paris, France\nRCS Paris\nNumero SIRET : 123 456 789 00010\nNumero de TVA intracommunautaire : FR XX 123456789\n\nContact :\n- Email : contact@coliway.fr\n- Telephone : +33 1 XX XX XX XX\n- Adresse postale : COLIWAY SAS, 15 Rue de la Paix, 75002 Paris, France",
      },
      {
        heading: '2. Directeur de la publication',
        content:
          'Le directeur de la publication est le President de COLIWAY SAS.\nEmail : direction@coliway.fr',
      },
      {
        heading: '3. Hebergeur',
        content:
          "Google Cloud Platform / Firebase\nGoogle Ireland Limited\nGordon House, Barrow Street\nDublin 4, Irlande\n\nSite internet : https://cloud.google.com\nTelephone : +353 1 543 1000\n\nLes donnees sont hebergees au sein de l'Union Europeenne (region europe-west1 -- Belgique), conformement aux exigences du RGPD.",
      },
      {
        heading: '4. Activite',
        content:
          "Coliway est une plateforme numerique de mise en relation entre des particuliers ou professionnels souhaitant faire livrer des colis et des livreurs independants. Coliway agit en qualite d'intermediaire technique et n'est ni transporteur, ni commissionnaire de transport.",
      },
      {
        heading: '5. Propriete intellectuelle',
        content:
          "L'ensemble des elements composant la Plateforme (structure, design, interfaces, logiciels, bases de donnees, textes, images, graphismes, logos, icones, sons, videos) est la propriete exclusive de COLIWAY SAS ou de ses partenaires et est protege par les lois relatives a la propriete intellectuelle.\n\nLa denomination \"Coliway\", le logo associe et l'ensemble des signes distinctifs sont des marques deposees aupres de l'INPI.\n\nToute reproduction, representation, modification, publication, adaptation, totale ou partielle, des elements de la Plateforme est interdite sans l'autorisation ecrite prealable de COLIWAY SAS.",
      },
      {
        heading: '6. Credits',
        content:
          'La Plateforme a ete concue et developpee par l\'equipe technique de COLIWAY SAS.\n\nLes illustrations, photographies et elements graphiques proviennent de :\n- creations originales de COLIWAY SAS ;\n- banques d\'images sous licence (le cas echeant).',
      },
      {
        heading: '7. Donnees personnelles',
        content:
          "La collecte et le traitement des donnees personnelles effectues dans le cadre de l'utilisation de la Plateforme sont decrits dans la Politique de Confidentialite.\n\nConformement au RGPD, les utilisateurs disposent de droits sur leurs donnees personnelles.\n\nDelegue a la Protection des Donnees (DPO)\nEmail : dpo@coliway.fr",
      },
      {
        heading: '8. Cookies',
        content:
          "La Plateforme utilise des cookies. Pour en savoir plus, consultez notre Politique de Cookies.",
      },
      {
        heading: '9. Liens hypertextes',
        content:
          "La Plateforme peut contenir des liens hypertextes vers des sites internet tiers. COLIWAY SAS n'exerce aucun controle sur ces sites et decline toute responsabilite quant a leur contenu.\n\nL'insertion de liens hypertextes vers la Plateforme est autorisee sous reserve de ne pas porter atteinte a l'image de Coliway.",
      },
      {
        heading: '10 & 11. Limitation de responsabilite et Droit applicable',
        content:
          "COLIWAY SAS s'efforce de fournir des informations aussi precises que possible sur la Plateforme. Toutefois, elle ne pourra etre tenue responsable des omissions, des inexactitudes et des carences dans la mise a jour.\n\nLes presentes mentions legales sont soumises au droit francais. En cas de litige, les tribunaux francais seront seuls competents.\n\nDerniere mise a jour : 1er mars 2026.",
      },
    ],
  },
};
