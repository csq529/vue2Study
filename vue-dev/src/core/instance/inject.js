/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

/**
 * 解析 inject 选项
 * 1、得到 { key: val } 形式的配置对象
 * 2、对解析结果做响应式处理
 */
export function initInjections (vm: Component) {
  // 从配置项上解析inject选项，最后得到reslut[key] = val的结果
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        // 解析结果做响应式处理，将每个 key 代理到 vue 实例上
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}
/**
 * 
 * @param {*} inject = {
 *  key: {
 *    from: provideKey,
 *    default: xx
 *  }
 * }
 * @param {*} vm 
 * @returns { key: val }
 */
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)
    
    // 遍历inject 选项中key组成的数据
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      // 获取from属性
      const provideKey = inject[key].from
      // 从祖先组件的配置项中找到 provide 选项，从而找到对应的 key 的值
      let source = vm
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      if (!source) {
        // 设置默认值
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
