// GENERATED FILE - DO NOT EDIT.
// Produced by scripts/gen-spec.mjs from vendor/qmrf.dtd (QMRF schema 1.0 / editor 3.0).
// Regenerate with `pnpm gen:spec`; CI fails when this file and the DTD disagree.

/** Chapter and catalog labels come from the DTD's #FIXED attributes - see scripts/gen-spec.mjs. */
export const SPEC = {
  "root": "QMRF",
  "chapters": [
    {
      "name": "QSAR_identifier",
      "chapter": "1",
      "label": "QSAR identifier",
      "repeatable": false,
      "fields": [
        {
          "name": "QSAR_title",
          "chapter": "1.1",
          "label": "QSAR identifier (title)",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "QSAR_models",
          "chapter": "1.2",
          "label": "Other related models",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "QSAR_software",
          "chapter": "1.3",
          "label": "Software coding the model",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "software_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "software_ref",
              "catalog": "software_catalog"
            }
          ]
        }
      ]
    },
    {
      "name": "QSAR_General_information",
      "chapter": "2",
      "label": "General information",
      "repeatable": false,
      "fields": [
        {
          "name": "qmrf_date",
          "chapter": "2.1",
          "label": "Date of QMRF",
          "labelFromDtd": true,
          "kind": "date",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "qmrf_authors",
          "chapter": "2.2",
          "label": "QMRF author(s) and contact details",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "authors_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "author_ref",
              "catalog": "authors_catalog"
            }
          ]
        },
        {
          "name": "qmrf_date_revision",
          "chapter": "2.3",
          "label": "Date of QMRF update(s)",
          "labelFromDtd": true,
          "kind": "date",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "qmrf_revision",
          "chapter": "2.4",
          "label": "QMRF update(s)",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "model_authors",
          "chapter": "2.5",
          "label": "Model developer(s) and contact details",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "authors_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "author_ref",
              "catalog": "authors_catalog"
            }
          ]
        },
        {
          "name": "model_date",
          "chapter": "2.6",
          "label": "Date of model development and/or publication",
          "labelFromDtd": true,
          "kind": "date",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "references",
          "chapter": "2.7",
          "label": "Reference(s) to main scientific papers and/or software package",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "publications_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "publication_ref",
              "catalog": "publications_catalog"
            }
          ]
        },
        {
          "name": "info_availability",
          "chapter": "2.8",
          "label": "Availability of information about the model",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "related_models",
          "chapter": "2.9",
          "label": "Availability of another QMRF for exactly the same model",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Endpoint",
      "chapter": "3",
      "label": "Defining the endpoint - OECD Principle 1",
      "repeatable": false,
      "fields": [
        {
          "name": "model_species",
          "chapter": "3.1",
          "label": "Species",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "model_endpoint",
          "chapter": "3.2",
          "label": "Endpoint",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "endpoints_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "endpoint_ref",
              "catalog": "endpoints_catalog"
            }
          ]
        },
        {
          "name": "endpoint_comments",
          "chapter": "3.3",
          "label": "Comment on endpoint",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "endpoint_units",
          "chapter": "3.4",
          "label": "Endpoint units",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "endpoint_variable",
          "chapter": "3.5",
          "label": "Dependent variable",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "endpoint_protocol",
          "chapter": "3.6",
          "label": "Experimental protocol",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "endpoint_data_quality",
          "chapter": "3.7",
          "label": "Endpoint data quality and variability",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Algorithm",
      "chapter": "4",
      "label": "Defining the algorithm - OECD Principle 2",
      "repeatable": false,
      "fields": [
        {
          "name": "algorithm_type",
          "chapter": "4.1",
          "label": "Type of model",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "algorithm_explicit",
          "chapter": "4.2",
          "label": "Explicit algorithm",
          "labelFromDtd": true,
          "kind": "algorithm",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [
            {
              "name": "algorithm_ref",
              "chapter": null,
              "label": "Algorithm ref",
              "labelFromDtd": false,
              "kind": "entry",
              "occurrences": "zeroOrMore",
              "repeatable": true,
              "text": false,
              "refCatalog": null,
              "enumAttrs": [],
              "dataAttrs": [
                {
                  "name": "idref",
                  "required": true,
                  "kind": "text",
                  "refCatalog": null
                }
              ],
              "children": []
            },
            {
              "name": "equation",
              "chapter": null,
              "label": "Equation",
              "labelFromDtd": false,
              "kind": "text",
              "occurrences": "once",
              "repeatable": false,
              "text": true,
              "refCatalog": null,
              "enumAttrs": [],
              "dataAttrs": [],
              "children": []
            }
          ]
        },
        {
          "name": "algorithms_descriptors",
          "chapter": "4.3",
          "label": "Descriptors in the model",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "descriptors_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "descriptor_ref",
              "catalog": "descriptors_catalog"
            }
          ]
        },
        {
          "name": "descriptors_selection",
          "chapter": "4.4",
          "label": "Descriptor selection",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "descriptors_generation",
          "chapter": "4.5",
          "label": "Algorithm and descriptor generation",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "descriptors_generation_software",
          "chapter": "4.6",
          "label": "Software name and version for descriptor generation",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "software_catalog",
          "enumAttrs": [],
          "dataAttrs": [
            {
              "name": "options",
              "required": false,
              "kind": "text",
              "refCatalog": null
            }
          ],
          "children": [],
          "refs": [
            {
              "element": "software_ref",
              "catalog": "software_catalog"
            }
          ]
        },
        {
          "name": "descriptors_chemicals_ratio",
          "chapter": "4.7",
          "label": "Chemicals/Descriptors ratio",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Applicability_domain",
      "chapter": "5",
      "label": "Defining the applicability domain - OECD Principle 3",
      "repeatable": true,
      "fields": [
        {
          "name": "app_domain_description",
          "chapter": "5.1",
          "label": "Description of the applicability domain of the model",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "app_domain_method",
          "chapter": "5.2",
          "label": "Method used to assess the applicability domain",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "app_domain_software",
          "chapter": "5.3",
          "label": "Software name and version for applicability domain assessment",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "software_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "software_ref",
              "catalog": "software_catalog"
            }
          ]
        },
        {
          "name": "applicability_limits",
          "chapter": "5.4",
          "label": "Limits of applicability",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Robustness",
      "chapter": "6",
      "label": "Internal validation - OECD Principle 4",
      "repeatable": false,
      "fields": [
        {
          "name": "training_set_availability",
          "chapter": "6.1",
          "label": "Availability of the training set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "training_set_data",
          "chapter": "6.2",
          "label": "Available information for the training set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "chemname",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "cas",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "smiles",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "inchi",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "mol",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "formula",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "nanomaterial",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "chemname",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "cas",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "smiles",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "inchi",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "mol",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "formula",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "nanomaterial",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "training_set_descriptors",
          "chapter": "6.3",
          "label": "Data for each descriptor variable for the training set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "dependent_var_availability",
          "chapter": "6.4",
          "label": "Data for the dependent variable for the training set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "other_info",
          "chapter": "6.5",
          "label": "Other information about the training set",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "preprocessing",
          "chapter": "6.6",
          "label": "Pre-processing of data before modelling",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "goodness_of_fit",
          "chapter": "6.7",
          "label": "Statistics for goodness-of-fit",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "loo",
          "chapter": "6.8",
          "label": "Robustness - Statistics obtained by leave-one-out cross-validation",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "lmo",
          "chapter": "6.9",
          "label": "Robustness - Statistics obtained by leave-many-out cross-validation",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "yscrambling",
          "chapter": "6.10",
          "label": "Robustness - Statistics obtained by Y-scrambling",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "bootstrap",
          "chapter": "6.11",
          "label": "Robustness - Statistics obtained by bootstrap",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "other_statistics",
          "chapter": "6.12",
          "label": "Robustness - Statistics obtained by other methods",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Predictivity",
      "chapter": "7",
      "label": "External validation - OECD Principle 4",
      "repeatable": true,
      "fields": [
        {
          "name": "validation_set_availability",
          "chapter": "7.1",
          "label": "Availability of the external validation set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "validation_set_data",
          "chapter": "7.2",
          "label": "Available information for the external validation set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "chemname",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "cas",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "smiles",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "inchi",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "mol",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "formula",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "nanomaterial",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "chemname",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "cas",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "smiles",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "inchi",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "mol",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "formula",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            },
            {
              "name": "nanomaterial",
              "required": true,
              "kind": "enum",
              "values": [
                "Yes",
                "No"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "validation_set_descriptors",
          "chapter": "7.3",
          "label": "Data for each descriptor variable for the external validation set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "validation_dependent_var_availability",
          "chapter": "7.4",
          "label": "Data for the dependent variable for the external validation set",
          "labelFromDtd": true,
          "kind": "question",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "dataAttrs": [
            {
              "name": "answer",
              "required": true,
              "kind": "enum",
              "values": [
                "All",
                "Some",
                "No",
                "Unknown"
              ],
              "refCatalog": null
            }
          ],
          "children": []
        },
        {
          "name": "validation_other_info",
          "chapter": "7.5",
          "label": "Other information about the external validation set",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "experimental_design",
          "chapter": "7.6",
          "label": "Experimental design of test set",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "validation_predictivity",
          "chapter": "7.7",
          "label": "Predictivity - Statistics obtained by external validation",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "validation_assessment",
          "chapter": "7.8",
          "label": "Predictivity - Assessment of the external validation set",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "validation_comments",
          "chapter": "7.9",
          "label": "Comments on the external validation of the model",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Interpretation",
      "chapter": "8",
      "label": "Providing a mechanistic interpretation - OECD Principle 5",
      "repeatable": false,
      "fields": [
        {
          "name": "mechanistic_basis",
          "chapter": "8.1",
          "label": "Mechanistic basis of the model",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "mechanistic_basis_comments",
          "chapter": "8.2",
          "label": "A priori or a posteriori mechanistic interpretation",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "mechanistic_basis_info",
          "chapter": "8.3",
          "label": "Other information about the mechanistic interpretation",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    },
    {
      "name": "QSAR_Miscelaneous",
      "chapter": "9",
      "label": "Miscellaneous information",
      "repeatable": false,
      "fields": [
        {
          "name": "comments",
          "chapter": "9.1",
          "label": "Comments",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "bibliography",
          "chapter": "9.2",
          "label": "Bibliography",
          "labelFromDtd": true,
          "kind": "reference",
          "occurrences": "once",
          "repeatable": true,
          "text": false,
          "refCatalog": "publications_catalog",
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [],
          "refs": [
            {
              "element": "publication_ref",
              "catalog": "publications_catalog"
            }
          ]
        },
        {
          "name": "attachments",
          "chapter": "9.3",
          "label": "Supporting information",
          "labelFromDtd": true,
          "kind": "group",
          "occurrences": "once",
          "repeatable": false,
          "text": false,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": [
            {
              "name": "attachment_training_data",
              "chapter": null,
              "label": "Attachment training data",
              "labelFromDtd": false,
              "kind": "attachment",
              "occurrences": "once",
              "repeatable": false,
              "text": false,
              "refCatalog": null,
              "enumAttrs": [],
              "dataAttrs": [],
              "children": [
                {
                  "name": "molecules",
                  "chapter": null,
                  "label": "Molecules",
                  "labelFromDtd": false,
                  "kind": "entry",
                  "occurrences": "zeroOrMore",
                  "repeatable": true,
                  "text": false,
                  "refCatalog": null,
                  "enumAttrs": [
                    {
                      "name": "embedded",
                      "required": false,
                      "kind": "enum",
                      "values": [
                        "Yes",
                        "No"
                      ],
                      "refCatalog": null
                    }
                  ],
                  "dataAttrs": [
                    {
                      "name": "embedded",
                      "required": false,
                      "kind": "enum",
                      "values": [
                        "Yes",
                        "No"
                      ],
                      "refCatalog": null
                    },
                    {
                      "name": "url",
                      "required": true,
                      "kind": "text",
                      "refCatalog": null
                    },
                    {
                      "name": "filetype",
                      "required": false,
                      "kind": "text",
                      "refCatalog": null
                    },
                    {
                      "name": "description",
                      "required": false,
                      "kind": "text",
                      "refCatalog": null
                    }
                  ],
                  "children": []
                }
              ]
            },
            {
              "name": "attachment_validation_data",
              "chapter": null,
              "label": "Attachment validation data",
              "labelFromDtd": false,
              "kind": "attachment",
              "occurrences": "once",
              "repeatable": false,
              "text": false,
              "refCatalog": null,
              "enumAttrs": [],
              "dataAttrs": [],
              "children": [
                {
                  "name": "molecules",
                  "chapter": null,
                  "label": "Molecules",
                  "labelFromDtd": false,
                  "kind": "entry",
                  "occurrences": "zeroOrMore",
                  "repeatable": true,
                  "text": false,
                  "refCatalog": null,
                  "enumAttrs": [
                    {
                      "name": "embedded",
                      "required": false,
                      "kind": "enum",
                      "values": [
                        "Yes",
                        "No"
                      ],
                      "refCatalog": null
                    }
                  ],
                  "dataAttrs": [
                    {
                      "name": "embedded",
                      "required": false,
                      "kind": "enum",
                      "values": [
                        "Yes",
                        "No"
                      ],
                      "refCatalog": null
                    },
                    {
                      "name": "url",
                      "required": true,
                      "kind": "text",
                      "refCatalog": null
                    },
                    {
                      "name": "filetype",
                      "required": false,
                      "kind": "text",
                      "refCatalog": null
                    },
                    {
                      "name": "description",
                      "required": false,
                      "kind": "text",
                      "refCatalog": null
                    }
                  ],
                  "children": []
                }
              ]
            },
            {
              "name": "attachment_documents",
              "chapter": null,
              "label": "Attachment documents",
              "labelFromDtd": false,
              "kind": "attachment",
              "occurrences": "once",
              "repeatable": false,
              "text": false,
              "refCatalog": null,
              "enumAttrs": [],
              "dataAttrs": [],
              "children": [
                {
                  "name": "document",
                  "chapter": null,
                  "label": "Document",
                  "labelFromDtd": false,
                  "kind": "entry",
                  "occurrences": "zeroOrMore",
                  "repeatable": true,
                  "text": false,
                  "refCatalog": null,
                  "enumAttrs": [
                    {
                      "name": "embedded",
                      "required": false,
                      "kind": "enum",
                      "values": [
                        "Yes",
                        "No"
                      ],
                      "refCatalog": null
                    }
                  ],
                  "dataAttrs": [
                    {
                      "name": "embedded",
                      "required": false,
                      "kind": "enum",
                      "values": [
                        "Yes",
                        "No"
                      ],
                      "refCatalog": null
                    },
                    {
                      "name": "url",
                      "required": true,
                      "kind": "text",
                      "refCatalog": null
                    },
                    {
                      "name": "filetype",
                      "required": false,
                      "kind": "text",
                      "refCatalog": null
                    },
                    {
                      "name": "description",
                      "required": false,
                      "kind": "text",
                      "refCatalog": null
                    }
                  ],
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "QMRF_Summary",
      "chapter": "10",
      "label": "Summary (JRC QSAR Model Database)",
      "repeatable": false,
      "fields": [
        {
          "name": "QMRF_number",
          "chapter": "10.1",
          "label": "QMRF number",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "date_publication",
          "chapter": "10.2",
          "label": "Publication date",
          "labelFromDtd": true,
          "kind": "date",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "keywords",
          "chapter": "10.3",
          "label": "Keywords",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        },
        {
          "name": "summary_comments",
          "chapter": "10.4",
          "label": "Comments",
          "labelFromDtd": true,
          "kind": "text",
          "occurrences": "once",
          "repeatable": false,
          "text": true,
          "refCatalog": null,
          "enumAttrs": [],
          "dataAttrs": [],
          "children": []
        }
      ]
    }
  ],
  "catalogs": [
    {
      "name": "software_catalog",
      "label": "Software",
      "entryElement": "software",
      "refElement": "software_ref",
      "occurrences": "zeroOrMore",
      "idAttr": "id",
      "attrs": [
        {
          "name": "id",
          "required": true,
          "kind": "id",
          "refCatalog": null
        },
        {
          "name": "name",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "url",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "number",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "description",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "version",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "contact",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "ontology_term",
          "required": false,
          "kind": "text",
          "refCatalog": null
        }
      ]
    },
    {
      "name": "algorithms_catalog",
      "label": "Algorithms",
      "entryElement": "algorithm",
      "refElement": "algorithm_ref",
      "occurrences": "zeroOrMore",
      "idAttr": "id",
      "attrs": [
        {
          "name": "id",
          "required": true,
          "kind": "id",
          "refCatalog": null
        },
        {
          "name": "definition",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "description",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "publication_ref",
          "required": false,
          "kind": "ref",
          "refCatalog": "publications_catalog"
        },
        {
          "name": "ontology_term",
          "required": false,
          "kind": "text",
          "refCatalog": null
        }
      ]
    },
    {
      "name": "descriptors_catalog",
      "label": "Descriptors",
      "entryElement": "descriptor",
      "refElement": "descriptor_ref",
      "occurrences": "zeroOrMore",
      "idAttr": "id",
      "attrs": [
        {
          "name": "id",
          "required": true,
          "kind": "id",
          "refCatalog": null
        },
        {
          "name": "name",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "units",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "description",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "publication_ref",
          "required": false,
          "kind": "ref",
          "refCatalog": "publications_catalog"
        },
        {
          "name": "ontology_term",
          "required": false,
          "kind": "text",
          "refCatalog": null
        }
      ]
    },
    {
      "name": "endpoints_catalog",
      "label": "Endpoints",
      "entryElement": "endpoint",
      "refElement": "endpoint_ref",
      "occurrences": "zeroOrMore",
      "idAttr": "id",
      "attrs": [
        {
          "name": "id",
          "required": true,
          "kind": "id",
          "refCatalog": null
        },
        {
          "name": "name",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "subgroup",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "group",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "protocol",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "protocol_uri",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "ontology_term",
          "required": false,
          "kind": "text",
          "refCatalog": null
        }
      ]
    },
    {
      "name": "publications_catalog",
      "label": "Publications",
      "entryElement": "publication",
      "refElement": "publication_ref",
      "occurrences": "zeroOrMore",
      "idAttr": "id",
      "attrs": [
        {
          "name": "id",
          "required": true,
          "kind": "id",
          "refCatalog": null
        },
        {
          "name": "title",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "url",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "doi",
          "required": false,
          "kind": "text",
          "refCatalog": null
        }
      ]
    },
    {
      "name": "authors_catalog",
      "label": "Authors",
      "entryElement": "author",
      "refElement": "author_ref",
      "occurrences": "zeroOrMore",
      "idAttr": "id",
      "attrs": [
        {
          "name": "id",
          "required": true,
          "kind": "id",
          "refCatalog": null
        },
        {
          "name": "name",
          "required": true,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "affiliation",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "contact",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "url",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "email",
          "required": false,
          "kind": "text",
          "refCatalog": null
        },
        {
          "name": "number",
          "required": true,
          "kind": "text",
          "refCatalog": null
        }
      ]
    }
  ]
}

/** Every element declared by the DTD, with cardinality, fixed attributes and editable attributes. */
export const ELEMENTS = {
  "algorithm": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "id",
        "required": true,
        "kind": "id",
        "refCatalog": null
      },
      {
        "name": "definition",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "description",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "publication_ref",
        "required": false,
        "kind": "ref",
        "refCatalog": "publications_catalog"
      },
      {
        "name": "ontology_term",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "algorithm_explicit": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "algorithm_ref",
        "occurrences": "zeroOrMore"
      },
      {
        "name": "equation",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.2"
      },
      {
        "name": "name",
        "value": "Explicit algorithm"
      }
    ],
    "dataAttrs": []
  },
  "algorithm_ref": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "catalog",
        "value": "algorithms_catalog"
      }
    ],
    "dataAttrs": [
      {
        "name": "idref",
        "required": true,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "algorithm_type": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.1"
      },
      {
        "name": "name",
        "value": "Type of model"
      }
    ],
    "dataAttrs": []
  },
  "algorithms_catalog": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "algorithm",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "algorithms_descriptors": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "descriptor_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.3"
      },
      {
        "name": "name",
        "value": "Descriptors in the model"
      }
    ],
    "dataAttrs": []
  },
  "app_domain_description": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "5.1"
      },
      {
        "name": "name",
        "value": "Description of the applicability domain of the model"
      }
    ],
    "dataAttrs": []
  },
  "app_domain_method": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "5.2"
      },
      {
        "name": "name",
        "value": "Method used to assess the applicability domain"
      }
    ],
    "dataAttrs": []
  },
  "app_domain_software": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "software_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "5.3"
      },
      {
        "name": "name",
        "value": "Software name and version for applicability domain assessment"
      }
    ],
    "dataAttrs": []
  },
  "applicability_limits": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "5.4"
      },
      {
        "name": "name",
        "value": "Limits of applicability"
      }
    ],
    "dataAttrs": []
  },
  "attachment_documents": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "document",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "attachment_training_data": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "molecules",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "attachment_validation_data": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "molecules",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "attachments": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "attachment_training_data",
        "occurrences": "once"
      },
      {
        "name": "attachment_validation_data",
        "occurrences": "once"
      },
      {
        "name": "attachment_documents",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "9.3"
      },
      {
        "name": "name",
        "value": "Supporting information"
      }
    ],
    "dataAttrs": []
  },
  "author": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "id",
        "required": true,
        "kind": "id",
        "refCatalog": null
      },
      {
        "name": "name",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "affiliation",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "contact",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "url",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "email",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "number",
        "required": true,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "author_ref": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "catalog",
        "value": "authors_catalog"
      }
    ],
    "dataAttrs": [
      {
        "name": "idref",
        "required": true,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "authors_catalog": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "author",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "bibliography": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "publication_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "9.2"
      },
      {
        "name": "name",
        "value": "Bibliography"
      }
    ],
    "dataAttrs": []
  },
  "bootstrap": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.11"
      },
      {
        "name": "name",
        "value": "Robustness - Statistics obtained by bootstrap"
      }
    ],
    "dataAttrs": []
  },
  "Catalogs": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "software_catalog",
        "occurrences": "zeroOrMore"
      },
      {
        "name": "algorithms_catalog",
        "occurrences": "zeroOrMore"
      },
      {
        "name": "descriptors_catalog",
        "occurrences": "zeroOrMore"
      },
      {
        "name": "endpoints_catalog",
        "occurrences": "zeroOrMore"
      },
      {
        "name": "publications_catalog",
        "occurrences": "zeroOrMore"
      },
      {
        "name": "authors_catalog",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "comments": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "9.1"
      },
      {
        "name": "name",
        "value": "Comments"
      }
    ],
    "dataAttrs": []
  },
  "date_publication": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "10.2"
      },
      {
        "name": "name",
        "value": "Publication date"
      }
    ],
    "dataAttrs": []
  },
  "dependent_var_availability": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.4"
      },
      {
        "name": "name",
        "value": "Data for the dependent variable for the training set"
      }
    ],
    "dataAttrs": [
      {
        "name": "answer",
        "required": true,
        "kind": "enum",
        "values": [
          "All",
          "Some",
          "No",
          "Unknown"
        ],
        "refCatalog": null
      }
    ]
  },
  "descriptor": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "id",
        "required": true,
        "kind": "id",
        "refCatalog": null
      },
      {
        "name": "name",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "units",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "description",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "publication_ref",
        "required": false,
        "kind": "ref",
        "refCatalog": "publications_catalog"
      },
      {
        "name": "ontology_term",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "descriptor_ref": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "catalog",
        "value": "descriptors_catalog"
      }
    ],
    "dataAttrs": [
      {
        "name": "idref",
        "required": true,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "descriptors_catalog": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "descriptor",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "descriptors_chemicals_ratio": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.7"
      },
      {
        "name": "name",
        "value": "Chemicals/Descriptors ratio"
      }
    ],
    "dataAttrs": []
  },
  "descriptors_generation": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.5"
      },
      {
        "name": "name",
        "value": "Algorithm and descriptor generation"
      }
    ],
    "dataAttrs": []
  },
  "descriptors_generation_software": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "software_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.6"
      },
      {
        "name": "name",
        "value": "Software name and version for descriptor generation"
      }
    ],
    "dataAttrs": [
      {
        "name": "options",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "descriptors_selection": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "4.4"
      },
      {
        "name": "name",
        "value": "Descriptor selection"
      }
    ],
    "dataAttrs": []
  },
  "document": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "embedded",
        "required": false,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "url",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "filetype",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "description",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "endpoint": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "id",
        "required": true,
        "kind": "id",
        "refCatalog": null
      },
      {
        "name": "name",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "subgroup",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "group",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "protocol",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "protocol_uri",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "ontology_term",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "endpoint_comments": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.3"
      },
      {
        "name": "name",
        "value": "Comment on endpoint"
      }
    ],
    "dataAttrs": []
  },
  "endpoint_data_quality": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.7"
      },
      {
        "name": "name",
        "value": "Endpoint data quality and variability"
      }
    ],
    "dataAttrs": []
  },
  "endpoint_protocol": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.6"
      },
      {
        "name": "name",
        "value": "Experimental protocol"
      }
    ],
    "dataAttrs": []
  },
  "endpoint_ref": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "catalog",
        "value": "endpoints_catalog"
      }
    ],
    "dataAttrs": [
      {
        "name": "idref",
        "required": true,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "endpoint_units": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.4"
      },
      {
        "name": "name",
        "value": "Endpoint units"
      }
    ],
    "dataAttrs": []
  },
  "endpoint_variable": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.5"
      },
      {
        "name": "name",
        "value": "Dependent variable"
      }
    ],
    "dataAttrs": []
  },
  "endpoints_catalog": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "endpoint",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "equation": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": []
  },
  "experimental_design": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.6"
      },
      {
        "name": "name",
        "value": "Experimental design of test set"
      }
    ],
    "dataAttrs": []
  },
  "goodness_of_fit": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.7"
      },
      {
        "name": "name",
        "value": "Statistics for goodness-of-fit"
      }
    ],
    "dataAttrs": []
  },
  "info_availability": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.8"
      },
      {
        "name": "name",
        "value": "Availability of information about the model"
      }
    ],
    "dataAttrs": []
  },
  "keywords": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "10.3"
      },
      {
        "name": "name",
        "value": "Keywords"
      }
    ],
    "dataAttrs": []
  },
  "lmo": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.9"
      },
      {
        "name": "name",
        "value": "Robustness - Statistics obtained by leave-many-out cross-validation"
      }
    ],
    "dataAttrs": []
  },
  "loo": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.8"
      },
      {
        "name": "name",
        "value": "Robustness - Statistics obtained by leave-one-out cross-validation"
      }
    ],
    "dataAttrs": []
  },
  "mechanistic_basis": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "8.1"
      },
      {
        "name": "name",
        "value": "Mechanistic basis of the model"
      }
    ],
    "dataAttrs": []
  },
  "mechanistic_basis_comments": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "8.2"
      },
      {
        "name": "name",
        "value": "A priori or a posteriori mechanistic interpretation"
      }
    ],
    "dataAttrs": []
  },
  "mechanistic_basis_info": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "8.3"
      },
      {
        "name": "name",
        "value": "Other information about the mechanistic interpretation"
      }
    ],
    "dataAttrs": []
  },
  "model_authors": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "author_ref",
        "occurrences": "oneOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.5"
      },
      {
        "name": "name",
        "value": "Model developer(s) and contact details"
      }
    ],
    "dataAttrs": []
  },
  "model_date": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.6"
      },
      {
        "name": "name",
        "value": "Date of model development and/or publication"
      }
    ],
    "dataAttrs": []
  },
  "model_endpoint": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "endpoint_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.2"
      },
      {
        "name": "name",
        "value": "Endpoint"
      }
    ],
    "dataAttrs": []
  },
  "model_species": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "3.1"
      },
      {
        "name": "name",
        "value": "Species"
      }
    ],
    "dataAttrs": []
  },
  "molecules": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "embedded",
        "required": false,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "url",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "filetype",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "description",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "other_info": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.5"
      },
      {
        "name": "name",
        "value": "Other information about the training set"
      }
    ],
    "dataAttrs": []
  },
  "other_statistics": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.12"
      },
      {
        "name": "name",
        "value": "Robustness - Statistics obtained by other methods"
      }
    ],
    "dataAttrs": []
  },
  "preprocessing": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.6"
      },
      {
        "name": "name",
        "value": "Pre-processing of data before modelling"
      }
    ],
    "dataAttrs": []
  },
  "publication": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "id",
        "required": true,
        "kind": "id",
        "refCatalog": null
      },
      {
        "name": "title",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "url",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "doi",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "publication_ref": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "catalog",
        "value": "publications_catalog"
      }
    ],
    "dataAttrs": [
      {
        "name": "idref",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "number",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "publications_catalog": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "publication",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "QMRF": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "QMRF_chapters",
        "occurrences": "once"
      },
      {
        "name": "Catalogs",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "schema_version",
        "value": "1.0"
      },
      {
        "name": "version",
        "value": "3.0"
      },
      {
        "name": "name",
        "value": "(Q)SAR Model Reporting Format"
      },
      {
        "name": "author",
        "value": "Joint Research Centre, European Commission; eNanoMapper"
      },
      {
        "name": "date",
        "value": "Oct 2016"
      },
      {
        "name": "contact",
        "value": "Joint Research Centre, European Commission; eNanoMapper"
      },
      {
        "name": "email",
        "value": "JRC-IHCP-COMPUTOX@ec.europa.eu"
      },
      {
        "name": "url",
        "value": "http://qmrf.sf.net"
      }
    ],
    "dataAttrs": []
  },
  "qmrf_authors": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "author_ref",
        "occurrences": "oneOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.2"
      },
      {
        "name": "name",
        "value": "QMRF author(s) and contact details"
      }
    ],
    "dataAttrs": []
  },
  "QMRF_chapters": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "QSAR_identifier",
        "occurrences": "once"
      },
      {
        "name": "QSAR_General_information",
        "occurrences": "once"
      },
      {
        "name": "QSAR_Endpoint",
        "occurrences": "once"
      },
      {
        "name": "QSAR_Algorithm",
        "occurrences": "once"
      },
      {
        "name": "QSAR_Applicability_domain",
        "occurrences": "oneOrMore"
      },
      {
        "name": "QSAR_Robustness",
        "occurrences": "once"
      },
      {
        "name": "QSAR_Predictivity",
        "occurrences": "oneOrMore"
      },
      {
        "name": "QSAR_Interpretation",
        "occurrences": "once"
      },
      {
        "name": "QSAR_Miscelaneous",
        "occurrences": "once"
      },
      {
        "name": "QMRF_Summary",
        "occurrences": "once"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "qmrf_date": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.1"
      },
      {
        "name": "name",
        "value": "Date of QMRF"
      }
    ],
    "dataAttrs": []
  },
  "qmrf_date_revision": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.3"
      },
      {
        "name": "name",
        "value": "Date of QMRF update(s)"
      }
    ],
    "dataAttrs": []
  },
  "QMRF_number": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "10.1"
      },
      {
        "name": "name",
        "value": "QMRF number"
      }
    ],
    "dataAttrs": []
  },
  "qmrf_revision": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.4"
      },
      {
        "name": "name",
        "value": "QMRF update(s)"
      }
    ],
    "dataAttrs": []
  },
  "QMRF_Summary": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "QMRF_number",
        "occurrences": "once"
      },
      {
        "name": "date_publication",
        "occurrences": "once"
      },
      {
        "name": "keywords",
        "occurrences": "once"
      },
      {
        "name": "summary_comments",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "10"
      },
      {
        "name": "name",
        "value": "Summary (JRC QSAR Model Database)"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Algorithm": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "algorithm_type",
        "occurrences": "once"
      },
      {
        "name": "algorithm_explicit",
        "occurrences": "once"
      },
      {
        "name": "algorithms_descriptors",
        "occurrences": "once"
      },
      {
        "name": "descriptors_selection",
        "occurrences": "once"
      },
      {
        "name": "descriptors_generation",
        "occurrences": "once"
      },
      {
        "name": "descriptors_generation_software",
        "occurrences": "once"
      },
      {
        "name": "descriptors_chemicals_ratio",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "4"
      },
      {
        "name": "name",
        "value": "Defining the algorithm - OECD Principle 2"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Applicability_domain": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "app_domain_description",
        "occurrences": "once"
      },
      {
        "name": "app_domain_method",
        "occurrences": "once"
      },
      {
        "name": "app_domain_software",
        "occurrences": "once"
      },
      {
        "name": "applicability_limits",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "5"
      },
      {
        "name": "name",
        "value": "Defining the applicability domain - OECD Principle 3"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Endpoint": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "model_species",
        "occurrences": "once"
      },
      {
        "name": "model_endpoint",
        "occurrences": "once"
      },
      {
        "name": "endpoint_comments",
        "occurrences": "once"
      },
      {
        "name": "endpoint_units",
        "occurrences": "once"
      },
      {
        "name": "endpoint_variable",
        "occurrences": "once"
      },
      {
        "name": "endpoint_protocol",
        "occurrences": "once"
      },
      {
        "name": "endpoint_data_quality",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "3"
      },
      {
        "name": "name",
        "value": "Defining the endpoint - OECD Principle 1"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_General_information": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "qmrf_date",
        "occurrences": "once"
      },
      {
        "name": "qmrf_authors",
        "occurrences": "once"
      },
      {
        "name": "qmrf_date_revision",
        "occurrences": "once"
      },
      {
        "name": "qmrf_revision",
        "occurrences": "once"
      },
      {
        "name": "model_authors",
        "occurrences": "once"
      },
      {
        "name": "model_date",
        "occurrences": "once"
      },
      {
        "name": "references",
        "occurrences": "once"
      },
      {
        "name": "info_availability",
        "occurrences": "once"
      },
      {
        "name": "related_models",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "2"
      },
      {
        "name": "name",
        "value": "General information"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_identifier": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "QSAR_title",
        "occurrences": "once"
      },
      {
        "name": "QSAR_models",
        "occurrences": "once"
      },
      {
        "name": "QSAR_software",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "1"
      },
      {
        "name": "name",
        "value": "QSAR identifier"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Interpretation": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "mechanistic_basis",
        "occurrences": "once"
      },
      {
        "name": "mechanistic_basis_comments",
        "occurrences": "once"
      },
      {
        "name": "mechanistic_basis_info",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "8"
      },
      {
        "name": "name",
        "value": "Providing a mechanistic interpretation - OECD Principle 5"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Miscelaneous": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "comments",
        "occurrences": "once"
      },
      {
        "name": "bibliography",
        "occurrences": "once"
      },
      {
        "name": "attachments",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "9"
      },
      {
        "name": "name",
        "value": "Miscellaneous information"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_models": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "1.2"
      },
      {
        "name": "name",
        "value": "Other related models"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Predictivity": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "validation_set_availability",
        "occurrences": "once"
      },
      {
        "name": "validation_set_data",
        "occurrences": "once"
      },
      {
        "name": "validation_set_descriptors",
        "occurrences": "once"
      },
      {
        "name": "validation_dependent_var_availability",
        "occurrences": "once"
      },
      {
        "name": "validation_other_info",
        "occurrences": "once"
      },
      {
        "name": "experimental_design",
        "occurrences": "once"
      },
      {
        "name": "validation_predictivity",
        "occurrences": "once"
      },
      {
        "name": "validation_assessment",
        "occurrences": "once"
      },
      {
        "name": "validation_comments",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "7"
      },
      {
        "name": "name",
        "value": "External validation - OECD Principle 4"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_Robustness": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "training_set_availability",
        "occurrences": "once"
      },
      {
        "name": "training_set_data",
        "occurrences": "once"
      },
      {
        "name": "training_set_descriptors",
        "occurrences": "once"
      },
      {
        "name": "dependent_var_availability",
        "occurrences": "once"
      },
      {
        "name": "other_info",
        "occurrences": "once"
      },
      {
        "name": "preprocessing",
        "occurrences": "once"
      },
      {
        "name": "goodness_of_fit",
        "occurrences": "once"
      },
      {
        "name": "loo",
        "occurrences": "once"
      },
      {
        "name": "lmo",
        "occurrences": "once"
      },
      {
        "name": "yscrambling",
        "occurrences": "once"
      },
      {
        "name": "bootstrap",
        "occurrences": "once"
      },
      {
        "name": "other_statistics",
        "occurrences": "once"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "6"
      },
      {
        "name": "name",
        "value": "Internal validation - OECD Principle 4"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_software": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "software_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "1.3"
      },
      {
        "name": "name",
        "value": "Software coding the model"
      }
    ],
    "dataAttrs": []
  },
  "QSAR_title": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "1.1"
      },
      {
        "name": "name",
        "value": "QSAR identifier (title)"
      }
    ],
    "dataAttrs": []
  },
  "references": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "publication_ref",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.7"
      },
      {
        "name": "name",
        "value": "Reference(s) to main scientific papers and/or software package"
      }
    ],
    "dataAttrs": []
  },
  "related_models": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "2.9"
      },
      {
        "name": "name",
        "value": "Availability of another QMRF for exactly the same model"
      }
    ],
    "dataAttrs": []
  },
  "software": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [],
    "dataAttrs": [
      {
        "name": "id",
        "required": true,
        "kind": "id",
        "refCatalog": null
      },
      {
        "name": "name",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "url",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "number",
        "required": true,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "description",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "version",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "contact",
        "required": false,
        "kind": "text",
        "refCatalog": null
      },
      {
        "name": "ontology_term",
        "required": false,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "software_catalog": {
    "pcdata": false,
    "empty": false,
    "choice": false,
    "children": [
      {
        "name": "software",
        "occurrences": "zeroOrMore"
      }
    ],
    "fixed": [],
    "dataAttrs": []
  },
  "software_ref": {
    "pcdata": false,
    "empty": true,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "catalog",
        "value": "software_catalog"
      }
    ],
    "dataAttrs": [
      {
        "name": "idref",
        "required": true,
        "kind": "text",
        "refCatalog": null
      }
    ]
  },
  "summary_comments": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "10.4"
      },
      {
        "name": "name",
        "value": "Comments"
      }
    ],
    "dataAttrs": []
  },
  "training_set_availability": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.1"
      },
      {
        "name": "name",
        "value": "Availability of the training set"
      }
    ],
    "dataAttrs": [
      {
        "name": "answer",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      }
    ]
  },
  "training_set_data": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.2"
      },
      {
        "name": "name",
        "value": "Available information for the training set"
      }
    ],
    "dataAttrs": [
      {
        "name": "chemname",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "cas",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "smiles",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "inchi",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "mol",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "formula",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "nanomaterial",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      }
    ]
  },
  "training_set_descriptors": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.3"
      },
      {
        "name": "name",
        "value": "Data for each descriptor variable for the training set"
      }
    ],
    "dataAttrs": [
      {
        "name": "answer",
        "required": true,
        "kind": "enum",
        "values": [
          "All",
          "Some",
          "No",
          "Unknown"
        ],
        "refCatalog": null
      }
    ]
  },
  "validation_assessment": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.8"
      },
      {
        "name": "name",
        "value": "Predictivity - Assessment of the external validation set"
      }
    ],
    "dataAttrs": []
  },
  "validation_comments": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.9"
      },
      {
        "name": "name",
        "value": "Comments on the external validation of the model"
      }
    ],
    "dataAttrs": []
  },
  "validation_dependent_var_availability": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.4"
      },
      {
        "name": "name",
        "value": "Data for the dependent variable for the external validation set"
      }
    ],
    "dataAttrs": [
      {
        "name": "answer",
        "required": true,
        "kind": "enum",
        "values": [
          "All",
          "Some",
          "No",
          "Unknown"
        ],
        "refCatalog": null
      }
    ]
  },
  "validation_other_info": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.5"
      },
      {
        "name": "name",
        "value": "Other information about the external validation set"
      }
    ],
    "dataAttrs": []
  },
  "validation_predictivity": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.7"
      },
      {
        "name": "name",
        "value": "Predictivity - Statistics obtained by external validation"
      }
    ],
    "dataAttrs": []
  },
  "validation_set_availability": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.1"
      },
      {
        "name": "name",
        "value": "Availability of the external validation set"
      }
    ],
    "dataAttrs": [
      {
        "name": "answer",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      }
    ]
  },
  "validation_set_data": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.2"
      },
      {
        "name": "name",
        "value": "Available information for the external validation set"
      }
    ],
    "dataAttrs": [
      {
        "name": "chemname",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "cas",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "smiles",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "inchi",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "mol",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "formula",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      },
      {
        "name": "nanomaterial",
        "required": true,
        "kind": "enum",
        "values": [
          "Yes",
          "No"
        ],
        "refCatalog": null
      }
    ]
  },
  "validation_set_descriptors": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "7.3"
      },
      {
        "name": "name",
        "value": "Data for each descriptor variable for the external validation set"
      }
    ],
    "dataAttrs": [
      {
        "name": "answer",
        "required": true,
        "kind": "enum",
        "values": [
          "All",
          "Some",
          "No",
          "Unknown"
        ],
        "refCatalog": null
      }
    ]
  },
  "yscrambling": {
    "pcdata": true,
    "empty": false,
    "choice": false,
    "children": [],
    "fixed": [
      {
        "name": "chapter",
        "value": "6.10"
      },
      {
        "name": "name",
        "value": "Robustness - Statistics obtained by Y-scrambling"
      }
    ],
    "dataAttrs": []
  }
}
