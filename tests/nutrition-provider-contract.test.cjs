const fs=require('node:fs'),a=require('node:assert/strict');
for(const path of ['js/data/nutrition-data.js','js/recipes/nutrition.js','js/recipes/nutrition-model.js','js/recipes/nutrition-food-form.js']){
 const source=fs.readFileSync(path,'utf8');a.doesNotMatch(source,/food-search|openfoodfacts|searchFoodProducts|pieceReference|densityProposal/);
}
console.log('PASS: manual nutrition UI has no provider, external search or estimated conversion dependency.');
