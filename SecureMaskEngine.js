class SecureMaskEngine {
    constructor() {
        this.patterns = {
            Java: this.createJavaPatterns()
        };
    }

    createJavaPatterns() {
        return {
            class: /\b(?:class|interface|enum)\s+([A-Z][A-Za-z0-9_]*)\s*(?:<[^>]+>)?\s*(?:implements\s+([A-Za-z0-9_$]+(\s*<[^>]+>)?)\s*(?:,\s*[A-Za-z0-9_$]+(\s*<[^>]+>)?)*)?\s*\{/g,
            method: /\b(public|private|protected|static|final|synchronized)?\s*([A-Za-z0-9<>\[\],\s]+)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g,
            constructor: /\b(public|private|protected)?\s+([A-Za-z0-9_$]+)\s*\(([\s\S]*?)\)\s*\{/g,
            variable: /\b([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*)\s+([A-Za-z_$][\w$]*)\s*(?:=|;)/g,
            parameter: /@RequestParam\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
            annotations: /@(GetMapping|PostMapping|RequestMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*"([^"]+)"\s*\)/g,
            javadoc: /\/\*\*[\s\S]*?\*\//g,
            fieldAssignment: /this\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*;/g
        };
    }

    mask(source, lang) {
        if (!this.patterns[lang]) {
            throw new Error("未対応の言語です");
        }

        let counters = this.initCounters();
        let masked = source;

        // 型名の匿名化
        masked = masked.replace(/(\W)([A-Z][A-Za-z0-9_$<>]+)(\s+)/g, (_, prefix, type, suffix) => {
            return `${prefix}Type${counters.type++}${suffix}`;
        });

        // Javadocマスキング
        masked = masked.replace(this.patterns[lang].javadoc, (comment) => {
            return comment
                .replace(/@param\s+(\w+)/g, (_, p) => `@param param${counters.docParam++}`)
                .replace(/(説明|パラメータ|parameter)[:：]\s*(\w+)/g, (_, desc, param) => `${desc}: param${counters.docParam++}`)
                .replace(/@return\s+([^\s]+)/g, (_, r) => `@return result${counters.docReturn++}`);
        });

        // フィールド宣言匿名化
        masked = masked.replace(/(private|protected|public)\s+(final\s+)?([A-Za-z0-9_$<>]+)\s+([A-Za-z_$][\w$]*)\s*;/g, 
            (_, modifier, finalKeyword, type, varName) => {
                return `${modifier} ${finalKeyword || ''}Type${counters.type++} var${counters.var++};`;
            }
        );

        // フィールドアクセス部分のマスキング（修正）
        masked = masked.replace(/this\.([A-Za-z_$][A-Za-z0-9_$]*)(\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*)*\s*\(/g, 
            (_, fieldName) => {
                return `this.var${counters.var++}(`;
            }
        );

        // フィールド代入部分のマスキング（修正）
        masked = masked.replace(/this\.([A-Za-z_$][A-Za-z0-9_$]*)(\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*)*;/g, 
            (_, fieldName) => {
                return `this.var${counters.var++};`;
            }
        );

        // アノテーションのマスキング
        masked = masked.replace(this.patterns[lang].annotations, (match, annotationType, urlPath) => {
            return `@${annotationType}("/${annotationType.toLowerCase()}${counters.annotation++}")`;
        });

        // クラス名とインタフェース名のマスキング
        masked = masked.replace(this.patterns[lang].class, (_, className, implementsPart) => {
            let maskedClass = `class Class${counters.class++}`;
            if (implementsPart) {
                let maskedInterfaces = implementsPart.split(',').map(iface => {
                    return `Interface${counters.interface++}`;
                }).join(', ');
                maskedClass += ` implements ${maskedInterfaces}`;
            }
            return maskedClass + ' {';
        });

        // コンストラクタのマスキング
        masked = masked.replace(this.patterns[lang].constructor, (_, modifier, constructorName, params) => {
            let maskedParams = params.split(/\s*,\s*/).map(param => {
                let [type, name] = param.trim().split(/\s+/);
                return `Type${counters.type++} var${counters.var++}`;
            }).join(', ');
            return `${modifier || ''} Constructor${counters.constructor++}(${maskedParams}) {`;
        });

        // メソッド名のマスキング
        masked = masked.replace(this.patterns[lang].method, (_, modifier, returnType, methodName, params) => {
            return `${modifier || ''} ${returnType} method${counters.method++}(${params}) {`;
        });

        // メソッド引数のマスキング
        masked = masked.replace(this.patterns[lang].parameter, (_, type, paramName) => {
            return `@RequestParam ${type} param${counters.param++}`;
        });

        // 変数名と型名のマスキング
        masked = masked.replace(this.patterns[lang].variable, (_, type, varName) => {
            return `Type${counters.type++} var${counters.var++}`;
        });

        return masked;
    }

    initCounters() {
        return { 
            class: 1, var: 1, method: 1, param: 1, docParam: 1, docReturn: 1, 
            annotation: 1, type: 1, interface: 1, constructor: 1, field: 1 
        };
    }
}
