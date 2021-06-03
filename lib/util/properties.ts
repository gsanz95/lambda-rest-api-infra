import pkg from '../../package.json';


export function getProperties(): Map<String, any> {
    const properties = new Map<String, any>()
    Object.entries(pkg.properties).forEach(entry => {
        properties.set(entry[0], entry[1])
    })

    return properties
}