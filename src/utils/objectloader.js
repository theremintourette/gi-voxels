var OBJ = require('webgl-obj-loader');

import { generateVertexUVs, flatten, generateVertexNormals } from './common.js';

class ObjectLoader {
  constructor() { }
  load(objectList) {
    return new Promise(resolve => {
      OBJ.downloadMeshes(objectList, meshes => {
        let resObjectArray = [];
        Object.entries(meshes).forEach(([key, value]) => {
          const generateNormals = !value.vertexNormals || !value.vertexNormals.length || isNaN(value.vertexNormals[0]);
          if (generateNormals)
            console.log("Generating normals manually ...")
          const res = {
            positions: value.vertices,
            normals: generateNormals ? generateVertexNormals(value.vertices, value.indices) : value.vertexNormals,
            indices: value.indices,
            uvs: value.textures
          };
          resObjectArray.push(res);
        });
        resolve(resObjectArray);
      });
    });
  }

  loadModelsAndMaterials(objectList) {
    return new Promise(resolve => {
      const p = OBJ.downloadModels(objectList);
      p.then(models => {
        let resObjectArray = [];
        // WARNING UGLY HACK AF!!!! Give images enough time to load!!!
        setTimeout( () => {
          Object.entries(models).forEach(([name, mesh]) => {
            const generateNormals = !mesh.vertexNormals || !mesh.vertexNormals.length || isNaN(mesh.vertexNormals[0]);
            const generateUVs = !mesh.textures || !mesh.textures.length || isNaN(mesh.textures[0]);
            if (generateNormals)
              console.info("Generating normals manually ...");
            if (generateUVs) 
              console.info("Generating UVs manually...");
            const res = {
              name: name,
              objectData : {
                positions: mesh.vertices,
                normals: generateNormals ? generateVertexNormals(mesh.vertices, mesh.indices) : mesh.vertexNormals,
                indices: mesh.indices,
                uvs: generateUVs ? generateVertexUVs(mesh.vertices) : mesh.textures,
              },
              materialData : {
                vertexMaterialIndices: mesh.vertexMaterialIndices,
                materialIndices: mesh.materialIndices,
                materialNames: mesh.materialNames,
                materialsByIndex: mesh.materialsByIndex,
              }
            };
            resObjectArray.push(res);
          });
          resolve(resObjectArray);
        }, 1500);
      })
    });
  }

}

export default ObjectLoader;