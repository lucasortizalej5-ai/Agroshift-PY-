"""Reglas de diversificación explicables. No prescribe aptitud, dosis ni fechas."""
CROPS = [
    {'id': 'soja', 'name': 'Soja', 'scientific_name': 'Glycine max', 'family': 'Fabaceae', 'group': 'Leguminosa'},
    {'id': 'maiz', 'name': 'Maíz', 'scientific_name': 'Zea mays', 'family': 'Poaceae', 'group': 'Gramínea'},
    {'id': 'trigo', 'name': 'Trigo', 'scientific_name': 'Triticum aestivum', 'family': 'Poaceae', 'group': 'Gramínea'},
    {'id': 'mandioca', 'name': 'Mandioca', 'scientific_name': 'Manihot esculenta', 'family': 'Euphorbiaceae', 'group': 'Raíz y tubérculo'},
    {'id': 'poroto', 'name': 'Poroto', 'scientific_name': 'Phaseolus vulgaris', 'family': 'Fabaceae', 'group': 'Leguminosa'},
]
SOURCES = [
    {'label': 'NASA Earth Observatory · How to Rotate Crops', 'url': 'https://science.nasa.gov/earth/earth-observatory/how-to-rotate-crops-154601/'},
    {'label': 'USDA NRCS · National Agronomy Manual, Part 503, Crop Production', 'url': 'https://www.nrcs.usda.gov/sites/default/files/2022-10/National-Agronomy-Manual.pdf'},
    {'label': 'FAO · Conservation Agriculture', 'url': 'https://www.fao.org/conservation-agriculture/en/'},
    {'label': 'Kew · Plants of the World Online (taxonomía)', 'url': 'https://powo.science.kew.org/'},
]
RULES = [
    {'id': 'ROT-01', 'text': 'No proponer repetir el mismo cultivo inmediatamente.', 'source_index': 1},
    {'id': 'ROT-02', 'text': 'Como filtro inicial de diversificación, priorizar otra familia botánica.', 'source_index': 1},
    {'id': 'DATA-01', 'text': 'El clima pasado aporta contexto y no demuestra aptitud futura.', 'source_index': None},
    {'id': 'SOIL-01', 'text': 'No deducir nutrientes ni fertilidad a partir de NASA POWER.', 'source_index': None},
]

def recommend(parcel, climate=None):
    previous = next((c for c in CROPS if c['id'] == parcel.get('previous_crop')), None)
    warnings = [
        'Opciones para evaluar, sin orden de rendimiento ni garantía de aptitud. La regla no reemplaza una rotación validada localmente.',
        'Faltan variedad, calendario agronómico local, humedad del suelo, historial sanitario y validación profesional.',
        'Cambiar de familia no garantiza eliminar plagas o enfermedades compartidas entre cultivos.',
    ]
    if parcel.get('soil_ph') is None:
        warnings.append('No hay un pH medido ni un análisis nutricional completo. No se estiman fertilidad ni fertilizantes.')
    else:
        warnings.append('El pH aportado se registra, pero no determina nutrientes ni dosis. Su interpretación requiere análisis y asesoría local.')
    climate_used = bool(climate and any(x['value'] is not None for x in climate['summary'].values()))
    if not climate_used:
        warnings.append('Sin datos NASA válidos: la propuesta solo usa el historial de cultivo. Consultá NASA para completar el contexto ambiental.')
    elif climate.get('warnings'):
        warnings.append('La consulta ambiental contiene avisos de calidad. Revisalos antes de interpretar los resultados.')
    if previous is None:
        return {'status': 'needs_history', 'rule_version': 'rotation-1.0', 'previous_crop': None,
                'candidates': [], 'excluded': [], 'rules': RULES, 'sources': SOURCES, 'warnings': warnings,
                'missing_inputs': ['Cultivo anterior'], 'climate_used_as_context': climate_used,
                'fertility_status': 'no_determinada', 'fertilizer_dose': None,
                'message': 'Registrá el cultivo anterior para aplicar las reglas de rotación sin inventar un historial.'}
    candidates, excluded = [], []
    for crop in CROPS:
        if crop['id'] == previous['id']:
            excluded.append({**crop, 'rule_id': 'ROT-01', 'reason': 'Repite el cultivo anterior.'})
        elif crop['family'] == previous['family']:
            excluded.append({**crop, 'rule_id': 'ROT-02', 'reason': f'Comparte la familia {previous["family"]} con {previous["name"]}.'})
        else:
            candidates.append({**crop, 'rule_ids': ['ROT-01', 'ROT-02'],
                               'reason': f'{crop["name"]} pertenece a {crop["family"]}, una familia diferente de {previous["name"]} ({previous["family"]}).',
                               'status': 'opcion_por_diversificacion',
                               'requires': ['Validar época de siembra y variedad local', 'Revisar suelo y disponibilidad de agua', 'Consultar manejo sanitario y duración del ciclo']})
    return {'status': 'initial_options', 'rule_version': 'rotation-1.0', 'previous_crop': previous,
            'candidates': candidates, 'excluded': excluded, 'rules': RULES, 'sources': SOURCES,
            'warnings': warnings, 'missing_inputs': [], 'climate_used_as_context': climate_used,
            'fertility_status': 'no_determinada', 'fertilizer_dose': None,
            'message': 'Opciones iniciales por diversificación de familias; el clima consultado se muestra como contexto, sin un puntaje de aptitud inventado.'}
