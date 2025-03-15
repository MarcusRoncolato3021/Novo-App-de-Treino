@echo off
echo Iniciando deploy...
git add .
git commit -m "Atualizacao do site"
git push
echo Deploy concluido! As alteracoes estarao disponiveis em alguns minutos no site. 