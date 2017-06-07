import { Injectable } from '@angular/core';
import {Subject, Observable} from 'rxjs/Rx';
import * as NodeTypes from './node-types';
import {RxHelper} from './rx-helper';
import {RxNode} from './node-types/rxNode';
import {GraphCreator} from './scene/graph-creator';
@Injectable()
export class AppService {
  private selectedCreationOption;
  private selectItemSubject;
  public removeItemSubject;
  private controlSubject;
  private itemSubscriptor;
  private resultsArray = [];
  private nodesList;
  private edgeList;

  constructor() {
    this.selectItemSubject = new Subject();
    this.removeItemSubject = new Subject();
    this.controlSubject = new Subject();
    this.itemSubscriptor = new Subject();
  }

  public getOperators() {
    return RxHelper.getRxOperator();
  }

  public setCreationOption(selectedCreation) {
    this.selectedCreationOption = selectedCreation;
  }

  public getCreationOption() {
    if (this.selectedCreationOption) {
      return new (this.selectedCreationOption)();
    }
  }

  public removeSelectedItem() {
    this.removeItemSubject.next();
  }

  /**
   * setSelectedItem reactive change selected item
   * @param selectedItem : any its an edge or node
   */
  public setSelectedItem(selectedItem) {
    this.selectItemSubject.next(selectedItem);
  }

  public getSelectedItem() {
    return this.selectItemSubject;
  }

  public controlScene(command) {
    this.controlSubject.next(command);
  }

  public getControlChanges() {
    return this.controlSubject;
  }

  public getItemSubscribe() {
    return this.itemSubscriptor;
  }

  private addNextResult(index, nextResult) {
    const resultsArray = this.resultsArray;
    resultsArray[index].nexts.push(nextResult);
    setTimeout(() => {
      const firstNext = resultsArray[index].nexts.shift();
      resultsArray[index].node = firstNext.node;
      resultsArray[index].data = firstNext.data;

      this.itemSubscriptor.next(resultsArray);
    }, GraphCreator.animateTime * resultsArray[index].nexts.length);
  }
  public subscribeItem = (node, data) => {
    const resultsArray = this.resultsArray;
    const index = resultsArray.findIndex(d => (d.data.id === data.id));
    if (index > -1) {
      this.addNextResult(index, {node, data});
    } else {
      resultsArray.push({node, data, nexts: []});
    }
    this.itemSubscriptor.next(resultsArray);
  }

  public getInitialData(width, height) {
    const xLoc = width / 2 - 25;
    const yLoc = 100;
    const nodes = [
      {id: 0, x: xLoc, y: yLoc, data: new NodeTypes.Create()},
      {id: 1, x: xLoc, y: yLoc + 200, data: new NodeTypes.Subscribe()}
    ];
    const edges = [{source: nodes[0], target: nodes[1]}];
    this.nodesList = nodes;
    this.edgeList = edges;
    return {edges, nodes};
  }

  public get delay(): number {
    return GraphCreator.animateTime;
  }
  public set delay(value) {
    GraphCreator.animateTime = value;
    this.refreshRxObjects();
  }


  public refreshRxObjects() {
    const nodes = this.nodesList;
    const edges = this.edgeList;
    this.resultsArray = [];

    // DISPOSE created rx objects
    for (const node of nodes) {
      node.data.dispose();
    }

    let levelcounter = 1;
    // Make Creator Observables
    for (const node of nodes) {
      if (!node.data.rx && node.data.maxInput === 0) {
        node.data.run(node, levelcounter, this.subscribeItem);
      }
    }

    // Connect Nodes By Edges
    let notFinished = true;
    while (notFinished) {
      levelcounter++;
      notFinished = false;
      const nodesNeedsRx = nodes.filter(n => !n.data.rx);
      for (const eachNode of nodesNeedsRx) {
        const nodeInputs = edges.filter(e => e.target === eachNode).map(e => e.source);
        if (eachNode.data.areInputsReady(nodeInputs)) {
          eachNode.data.graphInputs = nodeInputs.map(node => node.data.rx);
          eachNode.data.run(eachNode, levelcounter, this.subscribeItem);
          notFinished = true;
          break;
        }
      }
    }
  }
}
