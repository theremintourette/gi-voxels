import VoxelizationShader from '../materials/voxelizationshader.js'
import VoxelDebugShader from '../materials/voxeldebugshader.js'
import WorldPositionShader from '../materials/worldpositionshader.js'
import ScreenSpaceImageShader from '../materials/screenspaceimageshader.js'
import FrameBufferObject from '../utils/framebufferobject.js'
import OrthographicCamera from '../cameras/orthographiccamera.js'
import Cube from '../geometry/cube.js'
import Mesh from '../core/mesh.js'
import Quad from '../geometry/quad.js'
import { glContext } from '../renderer/renderer.js';
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';

class VoxelConeTracer {
  constructor(sceneScale, cubeSize, resolution, materialUBO, pointLightUBO, modelMatricesUBO, sceneUBO) {
    const gl = glContext();
    this.voxelTextureSize = resolution;
    const cube = new Cube(cubeSize, cubeSize, cubeSize);
    this.cubeMesh = new Mesh(cube.geometry, cube.indices);

    this.screenSpaceImageShader = new ScreenSpaceImageShader();
    this.voxelDebugShader = new VoxelDebugShader;
    this.voxelizationShader = new VoxelizationShader();
    this.worldPositionShader = new WorldPositionShader();

    this.materialUBO = materialUBO;
    this.pointLightUBO = pointLightUBO;
    this.modelMatricesUBO = modelMatricesUBO;
    this.sceneUBO = sceneUBO;

    this.quad = new Quad();
    this.backFBO = new FrameBufferObject(gl.canvas.width, gl.canvas.height);


    // TODO: Move boilerplate code to texture class
    this.xTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.xTexture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    this.zTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.zTexture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    this.yTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.yTexture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    // Create 3d texture
    this.voxelTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
    // TODO: Move to FBO class
    this.voxelFb = gl.createFramebuffer();
  }

  renderVoxelDebug(scene, camera) {
    const gl = glContext();
    this.worldPositionShader.activate();
    const program = this.worldPositionShader.program;

    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Back.
    gl.cullFace(gl.FRONT);
    //gl.bindFramebuffer(gl.FRAMEBUFFER, this.backFBO);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    this.backFBO.bind();

    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
    // Render to FBO
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.cubeMesh.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.voxelDebugShader.activate();
  
    gl.uniform3fv(gl.getUniformLocation(this.voxelDebugShader.program, 'cameraPosition'), camera.position);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.uniform1i(gl.getUniformLocation(this.voxelDebugShader.program, 'texture3D'), 0);
    this.backFBO.transitionToShaderResource(this.voxelDebugShader.program);
    this.quad.draw();

    // Draw quad to screen
    this.screenSpaceImageShader.activate();
    this.backFBO.transitionToShaderResource(this.screenSpaceImageShader.program);
    // TODO: HACK, use scale instead
    gl.viewport(0, 0, 150, 150);
    this.quad.draw();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }
  
  voxelize(scene, camera) {
    var t0 = performance.now();
    const gl = glContext();
    gl.viewport(0, 0, this.voxelTextureSize, this.voxelTextureSize);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.voxelFb);

    // TODO: Do we need depth test?
    // this.renderBuffer = gl.createRenderbuffer();
    // gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 64, 64);    
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer);

    // if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
    //   console.error("FBO is not complete asdasd" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
    // }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    this.voxelizationShader.activate();
    const program = this.voxelizationShader.program;
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    const sceneScale = 3000;
    // Render Y
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.yTexture);
    for (let i = 0; i < this.voxelTextureSize; i++ ) {
      const orthoCamera = new OrthographicCamera(
        -sceneScale,
        sceneScale, 
        -sceneScale, 
        sceneScale,
        sceneScale - (i / this.voxelTextureSize) * sceneScale * 2, // near
        sceneScale - ((i + 1) / this.voxelTextureSize) * sceneScale * 2); // far

      orthoCamera.up = vec3.fromValues(0.0, 0.0, 1.0);
      orthoCamera.lookAt(vec3.fromValues(0.0, -1.0, 0.0));
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.yTexture, 0, i);

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        console.error("FBO is not complete" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
      }

      const viewProjection = mat4.create();
      mat4.multiply(viewProjection, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
      gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjection'), false, viewProjection);

      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    
      // Render scene
      scene.objects.forEach(object => {
        this._renderObject(object, scene, camera, program);
      });
    }

    // Render Z
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.zTexture);
    for (let i = 0; i < this.voxelTextureSize; i++ ) {
      const orthoCamera = new OrthographicCamera(
        -sceneScale,
        sceneScale, 
        -sceneScale, 
        sceneScale,
        sceneScale - (i / this.voxelTextureSize) * sceneScale * 2, // near
        sceneScale - ((i + 1) / this.voxelTextureSize) * sceneScale * 2); // far

      orthoCamera.lookAt(vec3.fromValues(0.0, 0.0, -1.0));
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.zTexture, 0, i);

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        console.error("FBO is not complete" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
      }

      const viewProjection = mat4.create();
      mat4.multiply(viewProjection, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
      gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjection'), false, viewProjection);

      // Set uniforms
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    
      // Render scene
      scene.objects.forEach(object => {
        this._renderObject(object, scene, camera, program);
      });
    }
      
    // Render X
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.xTexture);
    for (let i = 0; i < this.voxelTextureSize; i++ ) {
      const orthoCamera = new OrthographicCamera(
        -sceneScale,
        sceneScale, 
        -sceneScale, 
        sceneScale,
        sceneScale - (i / this.voxelTextureSize) * sceneScale * 2, // near
        sceneScale - ((i + 1) / this.voxelTextureSize) * sceneScale * 2); // far

        orthoCamera.up = vec3.fromValues(0.0, 1.0, 0.0);
        orthoCamera.lookAt(vec3.fromValues(1.0, 0.0, 0.0));
      
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.xTexture, 0, i);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        console.error("FBO is not complete" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
      }

      const viewProjection = mat4.create();
      mat4.multiply(viewProjection, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
      gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjection'), false, viewProjection);

      // Set uniforms
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);

      // Render scene
      scene.objects.forEach(object => {
        this._renderObject(object, scene, camera, program);
      });
    }

    var t1 = performance.now();
    console.log("Voxel rendering took " + (t1 - t0) + " milliseconds.")

    const vSize = this.voxelTextureSize;    
    let data = new Uint8Array(this.voxelTextureSize * this.voxelTextureSize * this.voxelTextureSize * 4);
    // X texture
    for (let i = 0; i < this.voxelTextureSize; i++ ) { 
    
      let slice = new Uint8Array(this.voxelTextureSize * this.voxelTextureSize * 4);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.xTexture, 0, i);
      gl.readPixels(0, 0, this.voxelTextureSize, this.voxelTextureSize, gl.RGBA,  gl.UNSIGNED_BYTE, slice, 0);

      let j = 0;
      let rowCount = 0;
      for (let k = 0; k < vSize * vSize; k++) {
        if (k > 0 && k % vSize === 0)  {
          rowCount++;
        }

        const value = 0 + (vSize - 1) + k * vSize * vSize - i - (vSize * vSize * vSize * rowCount - vSize * rowCount);
        data[ (0 + (vSize - 1) + k * vSize * vSize - i - (vSize * vSize * vSize * rowCount - vSize * rowCount)) * 4 + 0] = slice[j++];
        data[ (0 + (vSize - 1) + k * vSize * vSize - i - (vSize * vSize * vSize * rowCount - vSize * rowCount)) * 4 + 1] = slice[j++]; 
        data[ (0 + (vSize - 1) + k * vSize * vSize - i - (vSize * vSize * vSize * rowCount - vSize * rowCount)) * 4 + 2] = slice[j++]; 
        data[ (0 + (vSize - 1) + k * vSize * vSize - i - (vSize * vSize * vSize * rowCount - vSize * rowCount)) * 4 + 3] = slice[j++]; 
      }
    }

    // Add to Y
    for (let i = 0; i < this.voxelTextureSize; i++ ) { 
    
      let slice = new Uint8Array(this.voxelTextureSize * this.voxelTextureSize * 4);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.yTexture, 0, i);
      gl.readPixels(0, 0, this.voxelTextureSize, this.voxelTextureSize, gl.RGBA,  gl.UNSIGNED_BYTE, slice, 0);

      let j = 0;
      let it = 0;
      let rowCount = 0;
      for (let k = 0; k < vSize * vSize; k++) {
        if (k > 0 && k % vSize === 0) { it = 0; rowCount++; }

        if (slice[j+0] > 0) {
          data[ (i * vSize + vSize * vSize * rowCount + vSize - it - 1) * 4 + 0] = slice[j+0];
        } 

        if (slice [j + 1] > 0) {
          data[ (i * vSize + vSize * vSize * rowCount + vSize - it - 1) * 4 + 1] = slice[j+1];
        } 

        if (slice [j + 2] > 0) {
          data[ (i * vSize + vSize * vSize * rowCount + vSize - it - 1) * 4 + 2] = slice[j+2];
        }
  
        if (slice[j + 3 ] > 0) {
          data[ (i * vSize + vSize * vSize * rowCount + vSize - it - 1) * 4 + 3] = slice[j+3];
        }
        j += 4;
        it++
      }
    }

    // Add to Z texture
    for (let i = 0; i < this.voxelTextureSize; i++ ) { 
      let slice = new Uint8Array(this.voxelTextureSize * this.voxelTextureSize * 4);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.zTexture, 0, i);
      gl.readPixels(0, 0, this.voxelTextureSize, this.voxelTextureSize, gl.RGBA,  gl.UNSIGNED_BYTE, slice, 0);

      for (let j = 0; j < this.voxelTextureSize * this.voxelTextureSize * 4; j++) {

        if (slice[j] > 0)
          data[this.voxelTextureSize * this.voxelTextureSize * i * 4 + j] = slice[ j];
      }
    }

    // Generate mip
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    gl.generateMipmap(gl.TEXTURE_3D);
    
    gl.disable(gl.BLEND);
    // Clean state
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    t1 = performance.now();
    console.log("Voxelization took " + (t1 - t0) + " milliseconds.")
  }

  _renderObject(object, scene, camera, program) {
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
  
    const materialData = object.materialData;
    // Different between objects
    this.materialUBO.update([
      ...[...materialData.ambient, 0.0], // vec3 16  0 
      ...[...materialData.diffuse, 0.0], // vec3 16  16
      // ...[...materialData.emissive, 0.0], // vec3 16 32
      ...[...materialData.specular, 0.0], // vec3 16  48
      materialData.specularExponent, // 4, this.voxelTextureSize
      Boolean(materialData.mapDiffuse),  // 4, 72
      Boolean(materialData.mapBump), //4, 76
      Boolean(materialData.mapSpecular),
      Boolean(materialData.mapDissolve)
    ]); // Real chunk size here

    const gl = glContext();
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'materialBuffer'), this.materialUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'modelMatrices'), this.modelMatricesUBO.location);
    object.uploadTextures(program);
    object.draw();
  }
};

export default VoxelConeTracer;